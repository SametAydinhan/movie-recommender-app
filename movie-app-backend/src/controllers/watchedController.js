const { MoviesMetaData, User, UserMovie } = require("../models");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

// Kullanıcının izlediği filmlerin listesini getir
exports.getWatchedMovies = async (req, res) => {
  try {
    // Kullanıcı ID'si - kimlik doğrulamasından gelecek
    // Şu an için demo amaçlı 1 kullanıyoruz
    const userId = req.userId || 1; // Gerçek uygulamada JWT'den alınacak

    // Eğer movieIds query parametresi varsa, localStorage verileri kullanılıyor demektir
    if (req.query.movieIds) {
      const movieIds = JSON.parse(req.query.movieIds);

      if (!movieIds || movieIds.length === 0) {
        return res.json({
          watchedMovies: [],
          count: 0,
        });
      }

      // ID'lere göre izlenen filmlerin detaylarını getir
      const watchedMovies = await MoviesMetaData.findAll({
        where: {
          id: movieIds,
        },
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

      console.log(
        `LocalStorage'dan ${watchedMovies.length} izlenen film getirildi`
      );

      return res.json({
        watchedMovies,
        count: watchedMovies.length,
      });
    }

    // movieIds yoksa normal veritabanı sorgusu yap
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

    // Film verilerini düzenleyerek client'a göndermek için hazırla
    const watchedMovies = userMovies.map(
      (userMovie) => userMovie.MoviesMetaData
    );

    console.log(
      `${watchedMovies.length} izlenen film getirildi - Kullanıcı: ${userId}`
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
    // Giriş yapmış kullanıcının ID'sini al
    const userId = req.userId;

    console.log(`getMyMovies çağrıldı - Kullanıcı ID: ${userId}`);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    console.log(`Kullanıcı ${userId} için izlenen filmler alınıyor...`);

    // Kullanıcı var mı kontrol et
    const user = await User.findByPk(userId);
    if (!user) {
      console.log(`Kullanıcı ${userId} bulunamadı!`);
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    // Sayfalama bilgileri
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    console.log(`Sayfalama: sayfa=${page}, limit=${limit}, offset=${offset}`);

    // Doğrudan SQL sorgusu kullanarak UserMovie ve MoviesMetaData tabloları birleştiriliyor
    // NOT: Tablo adları ve sütun adları veritabanı şemanıza göre değişebilir
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

    // Toplam kayıt sayısını almak için ikinci bir sorgu
    const countQuery = `
      SELECT COUNT(*) as total
      FROM "UserMovies"
      WHERE "UserId" = ? AND status = 'watched'
    `;

    try {
      // Filmleri getir
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
      console.log(`Bulunan film sayısı: ${movies.length}, toplam: ${total}`);

      // Film türlerini düzgün formata dönüştür
      const formattedMovies = movies.map((movie) => {
        let genres = [];
        try {
          if (movie.genres) {
            const genresStr = movie.genres.replace(/'/g, '"');
            const parsedGenres = JSON.parse(genresStr);
            genres = parsedGenres.map((g) => g.name);
          }
        } catch (error) {
          console.warn(
            `Film ID ${movie.id} için tür analizi yapılamadı:`,
            error.message
          );
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

    // İstek detaylarını logla
    console.log("İzlenen film ekleme isteği alındı:", {
      body: req.body,
      userId: req.userId,
      headers: req.headers.authorization ? "Bearer token mevcut" : "Token yok",
    });

    // Kullanıcı ID'si doğrulama
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    const userId = req.userId;
    console.log(
      "İzlenen film ekleniyor - Film ID:",
      movieId,
      "Kullanıcı ID:",
      userId
    );

    // Film ID'si geçerli mi kontrol et
    if (!movieId) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz film ID'si.",
      });
    }

    // Film veritabanında var mı kontrol et
    const movie = await MoviesMetaData.findByPk(movieId);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Film bulunamadı.",
      });
    }

    // Kullanıcı veritabanında var mı kontrol et
    const user = await User.findByPk(userId);
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
      // Eğer film zaten listede varsa ve status değeri "watched" ise hata döndür
      if (existingEntry.status === "watched") {
        return res.status(409).json({
          success: false,
          message: "Bu film zaten izlenenler listenizde.",
        });
      }

      // Eğer status değeri "watchlist" ise, watched'a güncelle
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

    // Modeli kontrol et
    console.log("UserMovie şeması:", Object.keys(UserMovie.rawAttributes));

    // Yeni izlenen film kaydı oluştur
    try {
      const newUserMovie = await UserMovie.create({
        UserId: userId,
        MoviesMetaDataId: movieId,
        status: "watched", // izlendiğini belirt
      });

      console.log("UserMovie kaydı oluşturuldu:", newUserMovie.id);
      console.log(
        `Film izlendi olarak işaretlendi - Film: ${movieId}, Kullanıcı: ${userId}`
      );

      // Başarılı yanıt
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
    } catch (createError) {
      console.error("Kayıt oluşturma hatası:", createError);
      return res.status(500).json({
        success: false,
        message: "Film izlendi olarak işaretlenirken veritabanı hatası oluştu.",
        error: createError.message,
        details: createError.errors
          ? createError.errors.map((e) => e.message)
          : null,
      });
    }
  } catch (error) {
    console.error("Film izlendi olarak işaretlenirken hata:", error);
    return res.status(500).json({
      success: false,
      message: "Film izlendi olarak işaretlenirken bir hata oluştu.",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// İzlenen filmler listesinden filmi çıkar
exports.removeWatchedMovie = async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);

    // Kullanıcı ID'si doğrulama
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Bu işlem için giriş yapmalısınız.",
      });
    }

    const userId = req.userId;

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

    console.log(
      `Film izlenmedi olarak işaretlendi - Film: ${movieId}, Kullanıcı: ${userId}`
    );

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

// movie-app-backend/src/routes/movieRoutes.js dosyasındaki yeni isimlerle uyumlu olarak
// aşağıdaki alias'ları ekleyelim
exports.addToWatched = exports.addWatchedMovie;
exports.removeFromWatched = exports.removeWatchedMovie;

// Belirli bir kullanıcının izlediği filmleri getiren endpoint
exports.getUserWatchedMovies = async (req, res) => {
  try {
    // URL'den kullanıcı ID'sini al
    const userId = parseInt(req.params.userId);

    // Şu anki giriş yapmış kullanıcının ID'si
    const loggedInUserId = req.userId;

    console.log("Kullanıcı filmleri isteği:", {
      requestedUserId: userId,
      loggedInUserId: loggedInUserId,
      isAuthorized: userId === loggedInUserId,
    });

    // Kullanıcı kendi verilerine erişebilir veya admin ise herkesin verilerine erişebilir
    // İleride admin kontrolü de eklenebilir
    if (userId !== loggedInUserId) {
      return res.status(403).json({
        success: false,
        message: "Başka bir kullanıcının verilerine erişim yetkiniz yok.",
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

    // Sayfalama için parametreler
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Filtreleme için parametreler - isteğe bağlı
    const title = req.query.title || "";
    const genre = req.query.genre || "";
    const year = req.query.year || "";

    // ORM kullanmak yerine doğrudan SQL sorgusu kullan
    try {
      // Film sayısını almak için sorgu
      const countQuery = `
        SELECT COUNT(DISTINCT um.id) as total
        FROM "UserMovies" um 
        JOIN "movies_metadata" mm ON um."MoviesMetaDataId" = mm.id
        WHERE um."UserId" = ? AND um.status = 'watched'
      `;

      // Filmleri getir - JOIN kullanarak
      const moviesQuery = `
        SELECT 
          mm.id, mm.title, mm.poster_path, mm.release_date, mm.vote_average, 
          mm.genres, mm.overview, mm.runtime, um."updatedAt" as watched_at
        FROM "UserMovies" um
        JOIN "movies_metadata" mm ON um."MoviesMetaDataId" = mm.id
        WHERE um."UserId" = ? AND um.status = 'watched'
        ORDER BY um."updatedAt" DESC
        LIMIT ? OFFSET ?
      `;

      // Şema bilgisini alabiliriz
      console.log(
        "Veritabanı tabloları:",
        await sequelize.getQueryInterface().showAllTables()
      );

      // İlk olarak filmlerin count bilgisini al
      const [countResults] = await sequelize.query(countQuery, {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT,
      });

      console.log("Count sonucu:", countResults);

      // Sonra filmleri getir
      const movies = await sequelize.query(moviesQuery, {
        replacements: [userId, limit, offset],
        type: sequelize.QueryTypes.SELECT,
      });

      console.log(
        `Kullanıcı ${userId} için ${movies.length} film bulundu (toplam: ${countResults.total})`
      );

      // Film verilerini düzenleyerek client'a göndermek için hazırla
      const formattedMovies = movies.map((movie) => {
        let genres = [];

        // Film türleri ayrıştırma
        try {
          if (movie.genres) {
            // String olarak saklanmış JSON'ı dönüştür
            if (typeof movie.genres === "string") {
              // SQL'den gelen string'i temizle ve JSON formatına dönüştür
              const genresStr = movie.genres.replace(/'/g, '"');
              try {
                const parsedGenres = JSON.parse(genresStr);
                genres = Array.isArray(parsedGenres)
                  ? parsedGenres.map((g) =>
                      typeof g === "object" ? g.name || g : g
                    )
                  : [genresStr];
              } catch (e) {
                console.warn(
                  `Film ID ${movie.id} için tür JSON ayrıştırma hatası:`,
                  e.message
                );
                genres = [movie.genres]; // Ayrıştırılamayan string'i doğrudan kullan
              }
            }
            // Zaten JSON/array olarak geldiyse
            else if (Array.isArray(movie.genres)) {
              genres = movie.genres.map((g) =>
                typeof g === "object" ? g.name || g : g
              );
            }
          }
        } catch (error) {
          console.warn(
            `Film ID ${movie.id} için tür ayrıştırma hatası:`,
            error.message
          );
          genres = [];
        }

        return {
          id: movie.id,
          title: movie.title || "İsimsiz Film",
          poster_path: movie.poster_path || "",
          release_date: movie.release_date || "",
          vote_average: movie.vote_average || 0,
          genres: genres,
          overview: movie.overview || "",
          runtime: movie.runtime || 0,
          watched_at: movie.watched_at,
        };
      });

      // Yanıt döndür
      return res.json({
        success: true,
        movies: formattedMovies,
        pagination: {
          total: parseInt(countResults.total || 0),
          page,
          limit,
          totalPages: Math.ceil((countResults.total || 0) / limit),
        },
      });
    } catch (sqlError) {
      console.error("SQL sorgusu sırasında hata:", sqlError);

      // Yedek olarak MoviesMetaData modelini kullanarak sorgu yap
      console.log("Alternatif sorgu deneniyor...");

      // UserMovie tablosundan sadece izlediği filmlerin ID'lerini al
      const userMovieIds = await UserMovie.findAll({
        where: {
          UserId: userId,
          status: "watched",
        },
        attributes: ["MoviesMetaDataId"],
        raw: true,
      });

      if (userMovieIds.length === 0) {
        return res.json({
          success: true,
          movies: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
        });
      }

      // Film ID'lerini çıkar
      const movieIds = userMovieIds.map((um) => um.MoviesMetaDataId);
      console.log(
        `Kullanıcı ${userId} için ${movieIds.length} film ID'si bulundu:`,
        movieIds
      );

      // Bu ID'lere göre filmleri getir
      const movies = await MoviesMetaData.findAll({
        where: {
          id: movieIds,
        },
        attributes: [
          "id",
          "title",
          "poster_path",
          "release_date",
          "vote_average",
          "genres",
          "overview",
          "runtime",
        ],
        raw: true,
      });

      console.log(`${movies.length} film bulundu.`);

      // Film verilerini düzenle
      const formattedMovies = movies.map((movie) => {
        let genres = [];

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
          console.warn(
            `Film ID ${movie.id} için tür ayrıştırma hatası:`,
            error.message
          );
          genres = [];
        }

        return {
          id: movie.id,
          title: movie.title || "İsimsiz Film",
          poster_path: movie.poster_path || "",
          release_date: movie.release_date || "",
          vote_average: movie.vote_average || 0,
          genres: genres,
          overview: movie.overview || "",
          runtime: movie.runtime || 0,
        };
      });

      return res.json({
        success: true,
        movies: formattedMovies,
        pagination: {
          total: movieIds.length,
          page,
          limit,
          totalPages: Math.ceil(movieIds.length / limit),
        },
      });
    }
  } catch (error) {
    console.error("İzlenen filmler alınırken hata:", error);
    return res.status(500).json({
      success: false,
      message: `İzlenen filmler alınırken bir hata oluştu: ${error.message}`,
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Kullanıcı profil sayfası için izleme istatistiklerini getir
exports.getUserWatchStats = async (req, res) => {
  try {
    // URL'den kullanıcı ID'sini al
    const userId = req.params.userId;

    // Kullanıcı kimliği kontrolü
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir kullanıcı ID'si gereklidir.",
      });
    }

    // Kullanıcı varlık kontrolü
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı.",
      });
    }

    // İzlenen film sayısını al
    const watchedCount = await UserMovie.count({
      where: {
        UserId: userId,
        status: "watched",
      },
    });

    // En son izlenen filmi al
    const lastWatched = await UserMovie.findOne({
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
            "poster_path",
            "release_date",
            "vote_average",
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    // En çok izlenen türleri getir
    const watchedMovies = await UserMovie.findAll({
      where: {
        UserId: userId,
        status: "watched",
      },
      include: [
        {
          model: MoviesMetaData,
          attributes: ["genres"],
        },
      ],
    });

    // Film türlerini işle
    const genreCounts = {};
    watchedMovies.forEach((userMovie) => {
      try {
        if (userMovie.MoviesMetaData && userMovie.MoviesMetaData.genres) {
          const genresStr = userMovie.MoviesMetaData.genres.replace(/'/g, '"');
          const genres = JSON.parse(genresStr);

          genres.forEach((genre) => {
            if (genre && genre.name) {
              genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
            }
          });
        }
      } catch (error) {
        console.warn(`Tür analizi hatası:`, error.message);
      }
    });

    // Türleri en popülerden en aza doğru sırala
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // İstatistikleri hazırla
    let lastWatchedMovie = null;
    if (lastWatched && lastWatched.MoviesMetaData) {
      lastWatchedMovie = {
        id: lastWatched.MoviesMetaData.id,
        title: lastWatched.MoviesMetaData.title,
        poster_path: lastWatched.MoviesMetaData.poster_path,
        release_date: lastWatched.MoviesMetaData.release_date,
        vote_average: lastWatched.MoviesMetaData.vote_average,
        watched_at: lastWatched.updatedAt,
      };
    }

    // Cevabı gönder
    res.json({
      success: true,
      stats: {
        watched_count: watchedCount,
        last_watched: lastWatchedMovie,
        top_genres: topGenres,
      },
    });

    console.log(
      `Kullanıcı ${userId} için izleme istatistikleri getirildi. İzlenen film sayısı: ${watchedCount}`
    );
  } catch (error) {
    console.error("İzleme istatistikleri getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "İstatistikler getirilirken bir hata oluştu.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
