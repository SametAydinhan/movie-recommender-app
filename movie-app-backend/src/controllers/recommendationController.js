const { MoviesMetaData, User, UserMovie } = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize");
const natural = require("natural");
const TfIdf = natural.TfIdf;
const vector = require("natural").Vector;
const crypto = require("crypto");

// Öneri önbelleği - her kullanıcı için önerileri saklayacak obje
const recommendationsCache = {
  // Önbellek formatı: { userId: { hash: "hashDegeri", timestamp: Date, recommendations: [], computationTime: Number } }
};

// Önbellekte tutma süresi (ms) - 24 saat (12 saatten artırıldı)
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * İzlenen filmlerin hash değerini hesaplar
 * @param {Array} watchedMovieIds - İzlenen film ID'leri
 * @returns {String} Hash değeri
 */
function calculateWatchedMoviesHash(watchedMovieIds) {
  const sorted = [...watchedMovieIds].sort((a, b) => a - b);
  const idString = sorted.join(",");
  return crypto.createHash("md5").update(idString).digest("hex");
}

/**
 * Kullanıcının izlediği filmlere benzer 25 film önerisi sunan API
 * Bu öneri sistemi film türleri ve özetlerine dayalı benzerlik hesaplamaktadır
 */
exports.getRecommendations = async (req, res) => {
  try {
    console.log("Film önerileri isteği alındı");
    const startTime = Date.now(); // Performans ölçümü için başlangıç zamanı

    // Kullanıcı ID'sini al
    const userId = req.userId;
    // Önbelleği temizleme bayrağı
    const forceRefresh = req.query.forceRefresh === "true";
    // Kaç film önerisi isteniyor (varsayılan: 25)
    const limit = parseInt(req.query.limit) || 25;

    if (!userId) {
      console.log("Kimlik doğrulama hatası: Oturum bulunamadı");
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    console.log(`Kullanıcı ${userId} için film önerileri hesaplanıyor...`);

    // Kullanıcının izlediği filmleri getir - doğrudan SQL ile getirerek ilişkileri daha iyi kontrol edelim
    const userMoviesQuery = `
      SELECT 
        um.MoviesMetaDataId as id, 
        mm.title, 
        mm.genres,
        mm.overview, 
        mm.vote_average
      FROM 
        UserMovies um
      INNER JOIN 
        movies_metadata mm ON um.MoviesMetaDataId = mm.id
      WHERE 
        um.UserId = ? 
        AND um.status = 'watched'
        AND mm.id IS NOT NULL
        AND mm.title IS NOT NULL
    `;

    const userMoviesResult = await sequelize.query(userMoviesQuery, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT,
    });

    console.log(
      `SQL sorgusu ile ${userMoviesResult.length} izlenen film bulundu`
    );

    if (userMoviesResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Öneri yapılabilmesi için izlenen film bulunmalıdır.",
      });
    }

    // Kullanıcının izlediği film ID'lerini al
    const watchedMovieIds = userMoviesResult.map((movie) => movie.id);
    console.log(`${watchedMovieIds.length} adet izlenen film ID'si alındı`);

    // İzlenen filmlerin hash değerini hesapla
    const watchedHash = calculateWatchedMoviesHash(watchedMovieIds);

    // Önbelleği kontrol et - forceRefresh true değilse ve önbellekte varsa
    if (
      !forceRefresh &&
      recommendationsCache[userId] &&
      recommendationsCache[userId].hash === watchedHash &&
      Date.now() - recommendationsCache[userId].timestamp < CACHE_TTL
    ) {
      console.log(`Kullanıcı ${userId} için önbellekten öneriler kullanılıyor`);
      const cachedRecommendations = recommendationsCache[
        userId
      ].recommendations.slice(0, limit);

      return res.json({
        success: true,
        recommendations: cachedRecommendations,
        fromCache: true,
        computationTime: recommendationsCache[userId].computationTime || 0,
      });
    }

    // Performans sınırlarını kaldırarak tüm izlenmemiş filmleri getir
    console.log("Tüm izlenmemiş filmler alınıyor...");

    // SQL sorgusu optimizasyonu - sadece gerekli alanları getir ve daha fazla film getir
    // Vote average ve popülerlik gibi faktörlere göre ön filtreleme yaparak işlem süresini kısalt
    const query = `
      SELECT 
        mm.id, mm.title, mm.poster_path, mm.release_date, mm.vote_average, 
        mm.genres, mm.overview, mm.popularity
      FROM 
        movies_metadata mm
      WHERE 
        mm.id NOT IN (${watchedMovieIds.join(",") || 0})
        AND mm.id IS NOT NULL
        AND mm.title IS NOT NULL
        AND mm.overview IS NOT NULL AND mm.overview != ''
        AND mm.genres IS NOT NULL AND mm.genres != ''
        AND mm.vote_average >= 5.0
      ORDER BY mm.popularity DESC, mm.vote_average DESC  
      LIMIT 3000
    `;

    const unwatchedMovies = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
    });

    console.log(`${unwatchedMovies.length} izlenmemiş film bulundu`);

    if (unwatchedMovies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "İzlenmemiş film bulunamadı veya tüm filmler izlenmiş.",
      });
    }

    // Geçerli film kayıtlarını kontrol et
    const validUnwatchedMovies = unwatchedMovies.filter(
      (movie) =>
        movie && movie.id && movie.title && typeof movie.id === "number"
    );

    console.log(
      `${validUnwatchedMovies.length} geçerli izlenmemiş film bulundu`
    );

    if (validUnwatchedMovies.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Geçerli izlenmemiş film bulunamadı.",
      });
    }

    // Benzerlik hesaplama işlemi - Kosinüs benzerliği kullanarak
    console.log("Film benzerlik matrisi oluşturuluyor...");
    try {
      const recommendedMovies = calculateSimilarityFromRaw(
        userMoviesResult,
        validUnwatchedMovies
      );
      console.log("Film benzerlik matrisi tamamlandı");

      // Boş öneri kontrolü
      if (!recommendedMovies || recommendedMovies.length === 0) {
        return res.json({
          success: true,
          recommendations: [],
          message: "Benzer film bulunamadı.",
        });
      }

      const endTime = Date.now();
      const computationTime = endTime - startTime;
      console.log(`Öneri hesaplama süresi: ${computationTime}ms`);

      // Önbelleğe kaydet
      recommendationsCache[userId] = {
        hash: watchedHash,
        timestamp: Date.now(),
        recommendations: recommendedMovies,
        computationTime: computationTime,
      };

      // İstenilen sayıda öneriyi döndür
      res.json({
        success: true,
        recommendations: recommendedMovies.slice(0, limit),
        computationTime: computationTime,
      });
    } catch (calculationError) {
      console.error("Benzerlik hesaplama hatası:", calculationError);
      return res.status(500).json({
        success: false,
        message:
          "Film önerileri hesaplanırken bir hata oluştu: " +
          calculationError.message,
      });
    }
  } catch (error) {
    console.error("Film önerileri alınırken hata:", error);
    res.status(500).json({
      success: false,
      message: "Film önerileri hesaplanırken bir hata oluştu.",
    });
  }
};

/**
 * Önbelleği temizler - test amaçlı kullanılabilir
 */
exports.clearRecommendationsCache = (req, res) => {
  const userId = req.userId;

  if (userId && recommendationsCache[userId]) {
    delete recommendationsCache[userId];
    console.log(`Kullanıcı ${userId} için önbellek temizlendi`);
  }

  return res.json({
    success: true,
    message: "Öneri önbelleği temizlendi",
  });
};

/**
 * Film benzerlik skorlarını yükselten, ağırlıkları optimize eden ve daha iyi sıralama yapan yeni benzerlik hesaplama fonksiyonu
 * @param {Array} userMovies - SQL sorgusu ile alınan kullanıcının izlediği filmler
 * @param {Array} unwatchedMovies - İzlenmemiş filmler
 * @returns {Array} Benzerlik puanına göre sıralanmış film önerileri
 */
function calculateSimilarityFromRaw(userMovies, unwatchedMovies) {
  console.log("Hesaplama başlıyor - İzlenen film sayısı:", userMovies.length);
  console.log(
    "Hesaplama başlıyor - İzlenmemiş film sayısı:",
    unwatchedMovies.length
  );

  // Performans iyileştirmesi: Önişleme ile gereksiz hesaplamaları azalt

  // 1. Kullanıcının izlediği filmlerin türlerini önceden işle
  const userGenreSets = [];
  const genreFrequency = {}; // Hangi türlerin ne sıklıkta göründüğünü takip et

  // Film türlerini ayrıştırma fonksiyonu - tür ayrıştırma mantığı aynı
  const parseGenres = (genresString) => {
    if (!genresString) return [];

    try {
      if (typeof genresString === "string") {
        if (
          (genresString.startsWith("[") && genresString.endsWith("]")) ||
          (genresString.startsWith("{") && genresString.endsWith("}"))
        ) {
          const parsed = JSON.parse(genresString);
          if (Array.isArray(parsed)) {
            if (
              parsed.length > 0 &&
              parsed[0] &&
              typeof parsed[0] === "object"
            ) {
              return parsed.map((genre) => genre.name || "").filter(Boolean);
            }
            return parsed.filter((genre) => typeof genre === "string");
          }
          if (typeof parsed === "object" && parsed.name) {
            return [parsed.name];
          }
        }

        if (genresString.includes(",")) {
          return genresString
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean);
        }

        return [genresString.trim()];
      }

      if (typeof genresString === "object" && !Array.isArray(genresString)) {
        if (genresString.name) return [genresString.name];
        return Object.values(genresString)
          .filter((v) => typeof v === "string")
          .map((v) => v.trim());
      }

      if (Array.isArray(genresString)) {
        return genresString
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object" && item.name)
              return item.name.trim();
            return "";
          })
          .filter(Boolean);
      }
    } catch (e) {
      console.error("Tür ayrıştırma hatası:", e);
    }

    return [];
  };

  // Kullanıcının tüm filmlerinden türleri çıkar ve frekanslarını hesapla
  userMovies.forEach((movie) => {
    const genres = parseGenres(movie.genres);
    const genreSet = new Set(genres);
    userGenreSets.push(genreSet);

    // Tür frekanslarını güncelle
    genres.forEach((genre) => {
      genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
    });
  });

  // Türlere dinamik ağırlık verme - kullanıcının daha çok izlediği türlere daha yüksek ağırlık
  const totalUserMovies = userMovies.length;
  const genreWeights = {};

  // Temel tür ağırlıklarını belirle
  const baseGenreWeights = {
    Action: 0.8,
    Adventure: 0.85,
    Animation: 0.9,
    Comedy: 0.75,
    Crime: 0.95,
    Documentary: 1.0,
    Drama: 0.7,
    Family: 0.85,
    Fantasy: 0.9,
    History: 0.95,
    Horror: 0.95,
    Music: 0.95,
    Mystery: 0.95,
    Romance: 0.85,
    "Science Fiction": 0.9,
    "TV Movie": 1.0,
    Thriller: 0.9,
    War: 0.95,
    Western: 0.95,
  };

  // Kullanıcının izleme alışkanlıklarına göre tür ağırlıklarını ayarla
  Object.keys(genreFrequency).forEach((genre) => {
    // Temel ağırlık veya varsayılan 0.85
    const baseWeight = baseGenreWeights[genre] || 0.85;

    // Frekansa dayalı ek ağırlık (en fazla %15 artış)
    const frequencyBoost = Math.min(
      0.15,
      (genreFrequency[genre] / totalUserMovies) * 0.3
    );

    // Yeni ağırlık = temel ağırlık + frekans artışı (max 1.0)
    genreWeights[genre] = Math.min(1.0, baseWeight + frequencyBoost);
  });

  // 2. TF-IDF hesaplaması için önişleme
  const tfidf = new TfIdf();

  // Kullanıcı filmlerinin metin içeriğini önce işle
  const allWatchedTexts = userMovies.map(
    (movie) => `${movie.title} ${movie.overview || ""}`
  );

  // TF-IDF'e kullanıcının filmlerini ekle
  allWatchedTexts.forEach((text) => tfidf.addDocument(text));

  // Kullanıcı filmlerinin vektörlerini önden hesapla
  const userMovieVectors = [];
  allWatchedTexts.forEach((text, i) => {
    const vector = {};
    const terms = text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);

    // Terim sayısı çok fazlaysa, sınırla
    const uniqueTerms = [...new Set(terms)].slice(0, 100);

    uniqueTerms.forEach((term) => {
      const tfidfValue = tfidf.tfidf(term, i);
      if (tfidfValue > 0) vector[term] = tfidfValue;
    });

    userMovieVectors.push(vector);
  });

  // 3. Kullanıcının oy verme davranışını önceden hesapla
  const userVotes = userMovies
    .map((movie) => movie.vote_average || 0)
    .filter((vote) => vote > 0);

  const meanVote =
    userVotes.length > 0
      ? userVotes.reduce((sum, vote) => sum + vote, 0) / userVotes.length
      : 0;

  const stdDev =
    userVotes.length > 0
      ? Math.sqrt(
          userVotes.reduce(
            (sum, vote) => sum + Math.pow(vote - meanVote, 2),
            0
          ) / userVotes.length
        )
      : 1;

  // Vektör benzerliği için optimize edilmiş kosinüs benzerliği hesaplama
  const calculateVectorCosineSimilarity = (vector1, vector2) => {
    if (
      !vector1 ||
      !vector2 ||
      typeof vector1 !== "object" ||
      typeof vector2 !== "object"
    )
      return 0;

    const v1Keys = Object.keys(vector1);
    const v2Keys = Object.keys(vector2);

    if (v1Keys.length === 0 || v2Keys.length === 0) return 0;

    // Optimize edilmiş nokta çarpımı hesaplama - daha kısa olan vektör üzerinden döngü
    const shouldIterateV1 = v1Keys.length < v2Keys.length;
    const keysToIterate = shouldIterateV1 ? v1Keys : v2Keys;
    const otherVector = shouldIterateV1 ? vector2 : vector1;

    let dotProduct = 0;
    let v1Magnitude = 0;
    let v2Magnitude = 0;

    // Daha hızlı nokta çarpımı
    for (const key of keysToIterate) {
      if (key in otherVector) {
        const val1 = shouldIterateV1 ? vector1[key] : otherVector[key];
        const val2 = shouldIterateV1 ? otherVector[key] : vector2[key];
        dotProduct += val1 * val2;
      }
    }

    // Her vektörün büyüklüğünü hesapla (bir kez)
    for (const key in vector1) {
      v1Magnitude += vector1[key] * vector1[key];
    }

    for (const key in vector2) {
      v2Magnitude += vector2[key] * vector2[key];
    }

    // Magnitudes
    v1Magnitude = Math.sqrt(v1Magnitude);
    v2Magnitude = Math.sqrt(v2Magnitude);

    // Kosinüs benzerliği
    if (v1Magnitude === 0 || v2Magnitude === 0) return 0;

    // Benzerlik skoru artırmak için ölçeklendirme faktörü
    const similarityScore = dotProduct / (v1Magnitude * v2Magnitude);
    return Math.pow(similarityScore, 0.9); // Üs değeri 1'den küçük olduğu için küçük değerleri biraz yükseltir
  };

  // Vote benzerliği hesaplama - önceden hesaplanmış ortalama ve standart sapma kullanılıyor
  const calculateVoteSimilarity = (movieVote) => {
    if (!movieVote || userVotes.length === 0) return 0;

    // Z-score hesaplama
    const zScore = (movieVote - meanVote) / (stdDev || 1);

    // Normal dağılım kullanarak benzerlik skoru hesaplama
    return Math.exp(-Math.pow(zScore, 2) / 6);
  };

  // Tür benzerliği hesaplama - optimize edilmiş
  const calculateGenreSimilarity = (movieGenres) => {
    if (!movieGenres.length || userGenreSets.length === 0) return 0;

    const movieGenreSet = new Set(movieGenres);

    // Hızlı erişim için Set kullan
    let totalSimilarity = 0;
    let maxSimilarity = 0;

    for (const userGenreSet of userGenreSets) {
      if (userGenreSet.size === 0) continue;

      // Kesişim ve birleşim kümelerini hesapla
      const intersection = [];
      let unionSize = userGenreSet.size + movieGenreSet.size;

      // Kesişimi ve ağırlıklı kesişimi hesapla
      let weightedIntersection = 0;

      for (const genre of movieGenreSet) {
        if (userGenreSet.has(genre)) {
          intersection.push(genre);
          unionSize--; // Kesişen elemanlar birleşimde bir kez sayılmalı

          // Ağırlık uygula
          const weight = genreWeights[genre] || 0.85;
          weightedIntersection += weight;
        }
      }

      // Kesişim yoksa benzerlik sıfır
      if (intersection.length === 0) continue;

      // Benzerlik hesapla: Ağırlıklı kesişim / Birleşim
      const similarity = weightedIntersection / (unionSize * 0.9);

      totalSimilarity += similarity;
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // Ortalama ve maksimum benzerlik kombinasyonu
    return (totalSimilarity / userGenreSets.length) * 0.5 + maxSimilarity * 0.5;
  };

  // Paralel işlem için filme göre benzerlik hesaplama - async/await ile optimize edilebilir
  const calculateMovieSimilarity = (movie, index) => {
    if (!movie || !movie.id) return null;

    // Film metin içeriğini hazırla
    const movieText = `${movie.title} ${movie.overview || ""}`;

    // 1. TF-IDF vektörünü hesapla
    tfidf.addDocument(movieText);
    const tfidfVector = {};
    const terms = movieText
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2);

    // Terim sayısını sınırla - performans için
    const uniqueTerms = [...new Set(terms)].slice(0, 100);

    uniqueTerms.forEach((term) => {
      const tfidfValue = tfidf.tfidf(term, allWatchedTexts.length + index);
      if (tfidfValue > 0) tfidfVector[term] = tfidfValue;
    });

    // Tüm kullanıcı filmleri ile TF-IDF benzerliğini hesapla
    let tfidfSimilarity = 0;
    let maxSimilarity = 0;

    for (let i = 0; i < userMovieVectors.length; i++) {
      const similarity = calculateVectorCosineSimilarity(
        userMovieVectors[i],
        tfidfVector
      );

      tfidfSimilarity += similarity;

      // En benzer filme bonus ver
      if (similarity > 0.5) {
        maxSimilarity = Math.max(maxSimilarity, similarity * 1.2);
      }
    }

    // Ortalama benzerlik ve en yüksek benzerliğin ağırlıklı ortalaması
    tfidfSimilarity =
      (tfidfSimilarity / userMovieVectors.length) * 0.7 + maxSimilarity * 0.3;

    // 2. Oylamaya dayalı benzerlik
    const voteSimilarity = calculateVoteSimilarity(movie.vote_average);

    // 3. Tür benzerliği
    const movieGenres = parseGenres(movie.genres);
    const genreSimilarity = calculateGenreSimilarity(movieGenres);

    // Ağırlıklı benzerlik skoru - daha fazla tür ağırlığı
    const weightedSimilarity =
      tfidfSimilarity * 0.3 + // Film içerik benzerliği (%30)
      genreSimilarity * 0.6 + // Tür benzerliği (%60)
      voteSimilarity * 0.1; // Oy benzerliği (%10)

    // Daha az rastgele varyasyon
    const randomVariance = Math.random() * 0.02; // %2'ye düşürüldü

    // Son benzerlik skoru - kare kök işlevi, küçük değerleri daha çok yükseltir
    const finalSimilarityScore = Math.sqrt(
      weightedSimilarity * 0.98 + randomVariance
    );

    return {
      id: movie.id,
      title: movie.title || "Başlıksız Film",
      poster_path: movie.poster_path || null,
      poster_url: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      release_date: movie.release_date || null,
      vote_average: movie.vote_average || 0,
      genres: movieGenres,
      overview: movie.overview || "",
      similarity_score: finalSimilarityScore,
      similarity_components: {
        tfidf: tfidfSimilarity,
        genre: genreSimilarity,
        vote: voteSimilarity,
      },
    };
  };

  // Benzerlik hesaplama işlemi - film sayısı büyükse alt kümelere bölerek hesaplama yapılabilir
  const batchSize = 500;
  let movieScores = [];

  // Filmler üzerinde dönecek
  if (unwatchedMovies.length <= batchSize) {
    // Tek seferde hesapla
    movieScores = unwatchedMovies
      .map(calculateMovieSimilarity)
      .filter((score) => score !== null);
  } else {
    // Büyük veri kümesi için toplu işleme
    const batches = Math.ceil(unwatchedMovies.length / batchSize);

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min((i + 1) * batchSize, unwatchedMovies.length);
      const batch = unwatchedMovies.slice(start, end);

      console.log(
        `Hesaplama: Parti ${i + 1}/${batches}, ${
          batch.length
        } film işleniyor...`
      );

      const batchScores = batch
        .map((movie, idx) => calculateMovieSimilarity(movie, start + idx))
        .filter((score) => score !== null);

      movieScores = [...movieScores, ...batchScores];
    }
  }

  // Benzerlik puanına göre sırala
  const sortedScores = movieScores.sort(
    (a, b) => b.similarity_score - a.similarity_score
  );

  // Minimum benzerlik skoru biraz düşürüldü - daha fazla çeşitlilik için
  const MIN_SIMILARITY_THRESHOLD = 0.05; // 0.08'den 0.05'e düşürüldü
  let filteredScores = sortedScores.filter(
    (movie) => movie.similarity_score >= MIN_SIMILARITY_THRESHOLD
  );

  // En iyi 25 filmi göster (ya da yeterli film yoksa tümünü)
  if (filteredScores.length < 5) {
    filteredScores = sortedScores.slice(0, Math.min(25, sortedScores.length));
  } else {
    filteredScores = filteredScores.slice(0, 25);
  }

  // Benzerlik skorlarını yüksek bir aralıkta dağıtacak yeni normalizasyon
  const highestScore = Math.max(
    ...filteredScores.map((m) => m.similarity_score)
  );
  const lowestScore = Math.min(
    ...filteredScores.map((m) => m.similarity_score)
  );
  const scoreRange = highestScore - lowestScore;

  // Daha hızlı normalizasyon için döngüyü basitleştirdim
  filteredScores.forEach((movie, index) => {
    const rawScore = movie.similarity_score;
    const rankingFactor = 1 - index / filteredScores.length;

    let normalizedScore = 0;

    if (scoreRange > 0) {
      // Basitleştirilmiş normalizasyon - sigmoid fonksiyonu kaldırıldı
      const minMaxNorm = (rawScore - lowestScore) / scoreRange;
      // Doğrusal kombinasyon - daha hızlı hesaplama
      normalizedScore = minMaxNorm * 0.6 + rankingFactor * 0.4;
    } else {
      normalizedScore = rankingFactor;
    }

    // Son değer aralığı [0.4, 0.95]
    movie.similarity_score = 0.4 + normalizedScore * 0.55;
  });

  return filteredScores;
}
