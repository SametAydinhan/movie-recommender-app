const { MoviesMetaData, User, UserMovie } = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

// Kullanıcının izlediği filmlerin listesini getir
exports.getWatchedMovies = async (req, res) => {
  try {
    const userId = req.userId || 1;

    // Eğer movieIds query parametresi varsa, localStorage verileri kullanılıyor
    if (req.query.movieIds) {
      const movieIds = JSON.parse(req.query.movieIds);

      if (!movieIds || movieIds.length === 0) {
        return res.json({ watchedMovies: [], count: 0 });
      }

      // ID'lere göre izlenen filmlerin detaylarını getir
      const watchedMovies = await MoviesMetaData.findAll({
        where: { id: movieIds },
        attributes: [
          "id",
          "title",
          "poster_path",
          "release_date",
          "vote_average",
          "genres",
          "overview",
          "belongs_to_collection",
        ],
      });

      return res.json({
        watchedMovies,
        count: watchedMovies.length,
      });
    }

    // Normal veritabanı sorgusu
    const userMovies = await UserMovie.findAll({
      where: { UserId: userId },
      include: [
        {
          model: MoviesMetaData,
          attributes: [
            "id",
            "title",
            "poster_path",
            "release_date",
            "vote_average",
            "genres",
            "overview",
            "belongs_to_collection",
          ],
        },
      ],
    });

    const watchedMovies = userMovies.map(
      (userMovie) => userMovie.MoviesMetaData
    );

    res.json({
      watchedMovies,
      count: watchedMovies.length,
    });
  } catch (error) {
    console.error("İzlenen filmler alınırken hata:", error);
    res
      .status(500)
      .json({ message: "İzlenen filmler alınırken bir hata oluştu." });
  }
};

// My Movies sayfası için kullanıcının izlediği filmleri getir
exports.getMyMovies = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    // Kullanıcı var mı kontrol et
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    // Sayfalama bilgileri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // SQL sorguları
    const query = `
      SELECT 
        mm.id, mm.title, mm.poster_path, mm.release_date, mm.vote_average, 
        mm.genres, mm.overview, mm.runtime, 
        um."updatedAt" as watched_at
      FROM "UserMovies" um
      INNER JOIN movies_metadata mm ON um."MoviesMetaDataId" = mm.id
      WHERE um."UserId" = ? AND um.status = 'watched'
      ORDER BY um."updatedAt" DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM "UserMovies"
      WHERE "UserId" = ? AND status = 'watched'
    `;

    try {
      // Filmleri ve toplam sayıyı al
      const [movies, countResult] = await Promise.all([
        sequelize.query(query, {
          replacements: [userId, limit, offset],
          type: sequelize.QueryTypes.SELECT,
        }),
        sequelize.query(countQuery, {
          replacements: [userId],
          type: sequelize.QueryTypes.SELECT,
        }),
      ]);

      const total = countResult[0].total;

      // Film verilerini düzenle
      const formattedMovies = movies.map((movie) => {
        let genres = [];
        try {
          if (movie.genres) {
            const genresStr = movie.genres.replace(/'/g, '"');
            const parsedGenres = JSON.parse(genresStr);
            genres = parsedGenres.map((g) => g.name);
          }
        } catch (error) {
          genres = [];
        }

        return {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genres: genres,
          overview: movie.overview,
          runtime: movie.runtime,
          watchedAt: movie.watched_at,
        };
      });

      // Toplam sayfa sayısını hesapla
      const totalPages = Math.ceil(total / limit);

      // Sonuç döndür
      return res.json({
        success: true,
        myMovies: formattedMovies,
        pagination: {
          total: parseInt(total),
          total_pages: totalPages,
          current_page: page,
          has_more: page < totalPages,
        },
      });
    } catch (sqlError) {
      console.error("SQL sorgusu sırasında hata:", sqlError);
      return res.status(500).json({
        success: false,
        message: "Filmler getirilirken veritabanı hatası oluştu.",
        error:
          process.env.NODE_ENV === "development" ? sqlError.message : undefined,
      });
    }
  } catch (error) {
    console.error("İzlenen filmler getirilirken hata:", error);
    return res.status(500).json({
      success: false,
      message: "İzlenen filmler getirilirken bir hata oluştu.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// İzlenen filmler listesine film ekle
exports.addWatchedMovie = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.userId;

    // Giriş kontrolü
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    // Film ID'si geçerli mi kontrol et
    if (!movieId) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz film ID'si.",
      });
    }

    // Film ve kullanıcı varlığını kontrol et
    const [movie, user] = await Promise.all([
      MoviesMetaData.findByPk(movieId),
      User.findByPk(userId),
    ]);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film bulunamadı.",
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    // Film zaten izlenenler listesinde mi kontrol et
    const existingEntry = await UserMovie.findOne({
      where: {
        UserId: userId,
        MoviesMetaDataId: movieId,
      },
    });

    if (existingEntry) {
      // Eğer film zaten listede varsa ve "watched" ise hata döndür
      if (existingEntry.status === "watched") {
        return res.status(409).json({
          success: false,
          message: "Bu film zaten izlenenler listenizde.",
        });
      }

      // Eğer "watchlist" ise, "watched"a güncelle
      existingEntry.status = "watched";
      await existingEntry.save();

      return res.status(200).json({
        success: true,
        message: `Film #${movieId} izlendi olarak güncellendi.`,
        watchedMovie: {
          id: existingEntry.id,
          movieId: movieId,
          userId: userId,
          status: "watched",
          updatedAt: existingEntry.updatedAt,
        },
      });
    }

    // Yeni izlenen film kaydı oluştur
    const newUserMovie = await UserMovie.create({
      UserId: userId,
      MoviesMetaDataId: movieId,
      status: "watched",
    });

    return res.status(201).json({
      success: true,
      message: `Film #${movieId} izlendi olarak işaretlendi.`,
      watchedMovie: {
        id: newUserMovie.id,
        movieId: movieId,
        userId: userId,
        status: "watched",
        createdAt: newUserMovie.createdAt,
      },
    });
  } catch (error) {
    console.error("Film izlendi olarak işaretlenirken hata:", error);
    return res.status(500).json({
      success: false,
      message: "Film izlendi olarak işaretlenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// İzlenen filmler listesinden filmi çıkar
exports.removeWatchedMovie = async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    const userId = req.userId;

    // Giriş kontrolü
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    // Film ID'si geçerli mi kontrol et
    if (isNaN(movieId)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz film ID'si.",
      });
    }

    // Film izlenenler listesinde var mı kontrol et
    const watchedMovie = await UserMovie.findOne({
      where: {
        UserId: userId,
        MoviesMetaDataId: movieId,
        status: "watched",
      },
    });

    if (!watchedMovie) {
      return res.status(404).json({
        success: false,
        message: "Bu film izlenenler listenizde bulunamadı.",
      });
    }

    // İzlenen filmi listeden kaldır
    await watchedMovie.destroy();

    // Başarılı yanıt
    res.json({
      success: true,
      message: `Film #${movieId} izlenmedi olarak işaretlendi.`,
    });
  } catch (error) {
    console.error("Film izlenmedi olarak işaretlenirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Film izlenmedi olarak işaretlenirken bir hata oluştu.",
      error: error.message,
    });
  }
};

// Alias'lar
exports.addToWatched = exports.addWatchedMovie;
exports.removeFromWatched = exports.removeWatchedMovie;

// Kullanıcının izlediği filmleri getir (userId parametresi ile)
exports.getUserWatchedMovies = async (req, res) => {
  try {
    // Kullanıcı kimliği kontrol
    const userIdFromParam = parseInt(req.params.userId);
    const userIdFromToken = req.userId;

    // Kendi hesabına mı erişiyor kontrol et
    if (userIdFromParam !== userIdFromToken) {
      return res.status(403).json({
        success: false,
        message: "Yalnızca kendi izleme listenize erişebilirsiniz.",
      });
    }

    const userId = userIdFromToken;

    // Kullanıcı var mı kontrol et
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    // Sayfalama parametreleri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // SQL sorgularını hazırla
    const countQuery = `
      SELECT COUNT(*) as total
      FROM UserMovies
      WHERE UserId = ? AND status = 'watched'
    `;

    const moviesQuery = `
      SELECT 
        mm.id, mm.title, mm.poster_path, mm.release_date, mm.vote_average, 
        mm.genres, mm.overview, mm.runtime, mm.adult, mm.original_language,
        um.updatedAt as watched_at
      FROM UserMovies um
      INNER JOIN movies_metadata mm ON um.MoviesMetaDataId = mm.id
      WHERE um.UserId = ? AND um.status = 'watched'
      ORDER BY um.updatedAt DESC
      LIMIT ? OFFSET ?
    `;

    // Önce toplam film sayısını al
    const [countResults] = await sequelize.query(countQuery, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT,
    });

    const total = parseInt(countResults.total || 0);
    const totalPages = Math.ceil(total / limit);

    // Filmleri getir
    const movies = await sequelize.query(moviesQuery, {
      replacements: [userId, limit, offset],
      type: sequelize.QueryTypes.SELECT,
    });

    // Film verilerini formatla
    const formattedMovies = movies.map((movie) => {
      let genres = [];

      // Film türlerini JSON formatından dönüştür
      try {
        if (movie.genres) {
          if (typeof movie.genres === "string") {
            const genresStr = movie.genres.replace(/'/g, '"');
            try {
              const parsedGenres = JSON.parse(genresStr);
              genres = Array.isArray(parsedGenres)
                ? parsedGenres.map((g) =>
                    typeof g === "object" ? g.name || g : g
                  )
                : [genresStr];
            } catch (e) {
              genres = [movie.genres];
            }
          } else if (Array.isArray(movie.genres)) {
            genres = movie.genres.map((g) =>
              typeof g === "object" ? g.name || g : g
            );
          }
        }
      } catch (error) {
        genres = [];
      }

      return {
        id: movie.id,
        title: movie.title || "İsimsiz Film",
        poster_path: movie.poster_path || "",
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genres: genres,
        overview: movie.overview || "",
        runtime: movie.runtime,
        watched_at: movie.watched_at,
        adult: movie.adult || false,
        original_language: movie.original_language || "en",
      };
    });

    // Sonuç döndür
    return res.json({
      success: true,
      movies: formattedMovies,
      pagination: {
        total: total,
        totalPages: totalPages,
        page: page,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("İzlenen filmler getirilirken hata:", error);
    return res.status(500).json({
      success: false,
      message: "İzlenen filmler getirilirken bir hata oluştu",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Kullanıcı profil sayfası için izleme istatistiklerini getir
exports.getUserWatchStats = async (req, res) => {
  try {
    // Oturum kontrolü
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Bu işlem için giriş yapmalısınız.",
        stats: getEmptyStats(),
      });
    }

    // Kullanıcı varlığını kontrol et
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        message: "Kullanıcı bulunamadı.",
        stats: getEmptyStats(),
      });
    }

    // İzlenen filmleri getir
    const watchedMovies = await UserMovie.findAll({
      where: {
        UserId: userId,
        status: "watched",
      },
      include: [
        {
          model: MoviesMetaData,
          attributes: [
            "id",
            "title",
            "release_date",
            "runtime",
            "genres",
            "vote_average",
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    if (watchedMovies.length === 0) {
      return res.json({ stats: getEmptyStats() });
    }

    // İzlenen film sayısı
    const totalWatched = watchedMovies.length;

    // Toplam izleme süresini hesapla
    let totalRuntime = 0;
    let validMovieCount = 0;

    watchedMovies.forEach((movie) => {
      try {
        if (movie && movie.MoviesMetaData) {
          // Runtime değerini çeşitli yollarla almayı dene
          let runtime = 0;

          if (movie.MoviesMetaData.runtime) {
            let parsedRuntime = parseInt(movie.MoviesMetaData.runtime, 10);

            // String ise temizleyip tekrar dene
            if (
              isNaN(parsedRuntime) &&
              typeof movie.MoviesMetaData.runtime === "string"
            ) {
              const cleanRuntime = movie.MoviesMetaData.runtime.replace(
                /[^0-9]/g,
                ""
              );
              parsedRuntime = parseInt(cleanRuntime, 10);
            }

            // Obje ise value özelliğini kontrol et
            if (
              isNaN(parsedRuntime) &&
              typeof movie.MoviesMetaData.runtime === "object"
            ) {
              if (movie.MoviesMetaData.runtime.value) {
                parsedRuntime = parseInt(
                  movie.MoviesMetaData.runtime.value,
                  10
                );
              }
            }

            // Geçerli bir sayı elde edildiyse kullan
            if (!isNaN(parsedRuntime) && parsedRuntime > 0) {
              runtime = parsedRuntime;
              validMovieCount++;
            } else {
              runtime = 120; // Varsayılan süre
            }
          } else {
            runtime = 120; // Runtime yoksa varsayılan süre
          }

          totalRuntime += runtime;
        } else {
          totalRuntime += 120; // Film bilgisi yoksa varsayılan süre
        }
      } catch (error) {
        totalRuntime += 120; // Hata durumunda varsayılan süre
      }
    });

    // Toplam süre hala 0 ise minimum değer ata
    if (totalRuntime === 0 && watchedMovies.length > 0) {
      totalRuntime = watchedMovies.length * 120;
    }

    // Saatleri hesapla
    const watchTimeHours = Math.max(Math.round(totalRuntime / 60), 0);

    // Zamanı formatla
    const watchTimeFormatted = formatWatchTime(totalRuntime);

    // Favori türleri analiz et
    const genreCounts = {};
    watchedMovies.forEach((movie) => {
      try {
        if (movie.MoviesMetaData && movie.MoviesMetaData.genres) {
          // JSON string'den tür bilgilerini çıkar
          let genres = parseGenres(movie.MoviesMetaData.genres);

          // Türleri say
          genres.forEach((genre) => {
            if (genre) {
              genreCounts[genre] = (genreCounts[genre] || 0) + 1;
            }
          });
        }
      } catch (e) {
        // Tür analizi hatasını yoksay
      }
    });

    // Türleri sayılarına göre sırala
    const favoriteGenres = Object.keys(genreCounts)
      .map((name) => ({ name, count: genreCounts[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Son izlenen 5 filmi hazırla
    const recentlyWatched = watchedMovies
      .slice(0, 5)
      .map((movie) => {
        if (movie && movie.MoviesMetaData) {
          return {
            id: movie.MoviesMetaData.id,
            title: movie.MoviesMetaData.title || "İsimsiz Film",
            date: new Date(movie.updatedAt).toLocaleDateString("tr-TR"),
          };
        }
        return null;
      })
      .filter(Boolean);

    // İstatistikleri döndür
    return res.json({
      success: true,
      stats: {
        totalWatched,
        favoriteGenres,
        watchTimeFormatted,
        watchTimeHours,
        recentlyWatched,
      },
    });
  } catch (error) {
    console.error("Kullanıcı istatistikleri alınırken hata:", error);

    // Hata durumunda boş istatistik döndür
    res.status(200).json({
      success: true,
      stats: getEmptyStats(),
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Sunucu hatası",
    });
  }
};

// Boş istatistikler için yardımcı fonksiyon
function getEmptyStats() {
  return {
    totalWatched: 0,
    favoriteGenres: [],
    watchTimeFormatted: "0 dakika",
    watchTimeHours: 0,
    recentlyWatched: [],
  };
}

// Zamanı formatla
function formatWatchTime(minutes) {
  if (minutes === 0) return "0 dakika";

  const minute = minutes % 60;
  const hour = Math.floor(minutes / 60) % 24;
  const day = Math.floor(minutes / (60 * 24)) % 7;
  const week = Math.floor(minutes / (60 * 24 * 7)) % 4;
  const month = Math.floor(minutes / (60 * 24 * 30)) % 12;
  const year = Math.floor(minutes / (60 * 24 * 365));

  let result = [];

  if (year > 0) result.push(`${year} yıl`);
  if (month > 0) result.push(`${month} ay`);
  if (week > 0) result.push(`${week} hafta`);
  if (day > 0) result.push(`${day} gün`);
  if (hour > 0) result.push(`${hour} saat`);
  if (minute > 0) result.push(`${minute} dakika`);

  // En büyük iki zaman birimini göster
  return result.slice(0, 2).join(" ");
}

// Türleri ayrıştır
function parseGenres(genresData) {
  try {
    if (!genresData) return [];

    if (typeof genresData === "string") {
      let genresStr = genresData
        .replace(/'/g, '"')
        .replace(/^[^[]*\[/, "[")
        .replace(/\][^]]*$/, "]");

      try {
        const parsed = JSON.parse(genresStr);
        return parsed.map((g) => g.name);
      } catch (jsonError) {
        // Alternatif regex yöntemiyle dene
        const genreMatches = genresStr.match(/"name"\s*:\s*"([^"]+)"/g);
        if (genreMatches) {
          return genreMatches
            .map((match) => {
              const nameMatch = match.match(/"name"\s*:\s*"([^"]+)"/);
              return nameMatch ? nameMatch[1] : "";
            })
            .filter(Boolean);
        }
      }
    } else if (Array.isArray(genresData)) {
      return genresData.map((g) => (typeof g === "object" ? g.name || g : g));
    }

    return [];
  } catch (error) {
    return [];
  }
}
