const { MoviesMetaData, Links, Credits, Keywords } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("../config/database");

// Film listesini getiren controller
exports.getMovies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "popularity";
    const sortOrder = req.query.sortOrder || "DESC";

    console.log("API isteği alındı - getMovies:", {
      page,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Sıralama ayarlarını belirle
    let order = [];
    if (sortBy === "title") {
      order = [["title", sortOrder]];
    } else if (sortBy === "release_date") {
      order = [["release_date", sortOrder]];
    } else if (sortBy === "vote_average") {
      order = [["vote_average", sortOrder]];
    } else {
      // Varsayılan olarak popularity'e göre sırala
      order = [["popularity", sortOrder]];
    }

    // Güvenli sıralama değerleri için kontrol et
    const validSortColumns = [
      "title",
      "release_date",
      "vote_average",
      "popularity",
    ];
    const validSortOrders = ["ASC", "DESC"];

    // Güvenlik kontrolü yap
    const safeSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "popularity";
    const safeSortOrder = validSortOrders.includes(sortOrder)
      ? sortOrder
      : "DESC";

    // TMDB ID'lerini de getirmek için SQL sorgusu - tablo ve alan adları modellere göre düzenlendi
    const query = `
      SELECT mm.id, mm.title, mm.poster_path, mm.release_date, mm.vote_average, 
             mm.overview, mm.genres, mm.belongs_to_collection, mm.popularity, 
             mm.vote_count, mm.runtime, l.tmdbId
      FROM movies_metadata mm
      LEFT JOIN links l ON mm.id = l.movieId
      ORDER BY mm.${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    // Veritabanından filmleri ve TMDB ID'lerini çek - parametreleri ayrı gönder
    const movies = await sequelize.query(query, {
      replacements: [limit, offset],
      type: sequelize.QueryTypes.SELECT,
    });

    // Toplam film sayısını al
    const countResult = await sequelize.query(
      "SELECT COUNT(*) as count FROM movies_metadata",
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const count = countResult[0].count;

    console.log(
      `Veritabanından ${movies.length} film çekildi, toplam: ${count}`
    );

    if (movies.length === 0) {
      console.log("DİKKAT: Veritabanında film bulunamadı!");
    } else {
      console.log("İlk film örneği:", JSON.stringify(movies[0]));
    }

    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(count / limit);

    // Her iki frontend stilini desteklemek için iki format da gönderilecek
    res.json({
      movies: movies, // Yeni format
      results: movies, // Eski format
      page,
      totalResults: count, // Yeni format
      total_results: count, // Eski format
      totalPages: totalPages, // Yeni format
      total_pages: totalPages, // Eski format
    });
  } catch (error) {
    console.error("Film listesi alınırken hata:", error);
    res.status(500).json({ message: "Filmler alınırken bir hata oluştu." });
  }
};

// Film detayını getiren controller
exports.getMovieById = async (req, res) => {
  try {
    const movieId = req.params.id;
    console.log("API isteği alındı - getMovieById:", { movieId });

    // Film bilgilerini al - include kısmını kaldırdık, sorunu çözmek için
    const movie = await MoviesMetaData.findByPk(movieId);

    if (!movie) {
      console.log(`Film bulunamadı: ID=${movieId}`);
      return res.status(404).json({ message: "Film bulunamadı" });
    }

    console.log(`Film bulundu: ${movie.title}`);
    res.json(movie);
  } catch (error) {
    console.error("Film detayı alınırken hata:", error);
    res.status(500).json({ message: "Film detayı alınırken bir hata oluştu." });
  }
};

// Gelişmiş arama yapan controller
exports.searchMovies = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const query = req.query.query || "";
    const genre = req.query.genre || "";
    const year = req.query.year || "";
    const sortBy = req.query.sortBy || "popularity";
    const sortOrder = req.query.sortOrder || "DESC";

    console.log("API isteği alındı - searchMovies:", {
      query,
      genre,
      year,
      page,
      limit,
      sortBy,
      sortOrder,
    });

    // Sıralama ayarlarını belirle
    let order = [];
    if (sortBy === "title") {
      order = [["title", sortOrder]];
    } else if (sortBy === "release_date") {
      order = [["release_date", sortOrder]];
    } else if (sortBy === "vote_average") {
      order = [["vote_average", sortOrder]];
    } else {
      // Varsayılan olarak popularity'e göre sırala
      order = [["popularity", sortOrder]];
    }

    // Arama filtresini oluştur
    let whereClause = {};

    // Başlıkta arama - case insensitive
    if (query && query.trim() !== "") {
      whereClause.title = {
        [Op.like]: `%${query}%`,
      };
    }

    // Yıla göre filtreleme
    if (year && year.trim() !== "") {
      whereClause.release_date = {
        [Op.like]: `${year}%`,
      };
    }

    // Türe göre filtreleme
    if (genre && genre.trim() !== "") {
      whereClause.genres = {
        [Op.like]: `%${genre}%`,
      };
    }

    console.log("Arama kriterleri:", JSON.stringify(whereClause));

    // Filmleri veritabanından çek - veritabanında olan alanları iste
    const { count, rows: movies } = await MoviesMetaData.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order,
      attributes: [
        "id",
        "title",
        "poster_path",
        "release_date",
        "vote_average",
        "overview",
        "genres",
        "popularity",
      ],
    });

    console.log(`Arama sonucu ${movies.length} film bulundu, toplam: ${count}`);

    if (movies.length === 0) {
      console.log(`"${query}" araması için sonuç bulunamadı`);
    }

    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(count / limit);

    // Her iki format için yanıt
    res.json({
      movies: movies, // Yeni format
      results: movies, // Eski format
      page: parseInt(page),
      totalResults: count, // Yeni format
      total_results: count, // Eski format
      totalPages: totalPages, // Yeni format
      total_pages: totalPages, // Eski format
    });
  } catch (error) {
    console.error("Film araması yapılırken hata:", error);
    res.status(500).json({ message: "Filmler aranırken bir hata oluştu." });
  }
};

// Basit arama yapan controller (Normal sayfa URL'siyle uyumlu)
exports.simpleSearch = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    console.log("API isteği alındı - simpleSearch:", {
      search,
      page,
      limit,
    });

    // Güvenli arama terimi hazırla - SQL enjeksiyon önleme
    const safeSearch = `%${search.replace(/[%_']/g, (char) => `\\${char}`)}%`;

    // TMDB ID'lerini de içeren arama sorgusu - tablo ve alan adları modellere göre düzenlendi
    const query = `
      SELECT mm.id, mm.title, mm.poster_path, mm.release_date, mm.vote_average, 
             mm.overview, mm.genres, mm.belongs_to_collection, mm.popularity,
             mm.vote_count, mm.runtime, l.tmdbId
      FROM movies_metadata mm
      LEFT JOIN links l ON mm.id = l.movieId
      WHERE mm.title LIKE ?
      ORDER BY mm.popularity DESC
      LIMIT ? OFFSET ?
    `;

    // Veritabanından filmleri ve TMDB ID'lerini çek - parametreleri ayrı gönder
    const movies = await sequelize.query(query, {
      replacements: [safeSearch, limit, offset],
      type: sequelize.QueryTypes.SELECT,
    });

    // Toplam film sayısını al - arama filtresine göre
    const countResult = await sequelize.query(
      `
      SELECT COUNT(*) as count 
      FROM movies_metadata 
      WHERE title LIKE ?
    `,
      {
        replacements: [safeSearch],
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const count = countResult[0].count;

    console.log(`Arama sonucu ${movies.length} film bulundu, toplam: ${count}`);

    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(count / limit);

    // Her iki format için yanıt
    res.json({
      movies: movies, // Yeni format
      results: movies, // Eski format
      page,
      totalResults: count, // Yeni format
      total_results: count, // Eski format
      totalPages: totalPages, // Yeni format
      total_pages: totalPages, // Eski format
    });
  } catch (error) {
    console.error("Film araması yapılırken hata:", error);
    res.status(500).json({ message: "Filmler aranırken bir hata oluştu." });
  }
};
