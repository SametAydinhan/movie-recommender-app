const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");
const watchedController = require("../controllers/watchedController"); // İzlenen filmler controller'ı
const recommendationController = require("../controllers/recommendationController"); // Öneri controller'ı ekledik
const { authenticateToken } = require("../middleware/auth"); // Auth middleware'ini ekle

// Kimlik doğrulama gerektirmeyen route'lar (public)
// Film listeleme route'ları
router.get("/", movieController.getMovies);

// Basit arama route'u (Frontend'in kullandığı format)
router.get("/search", movieController.simpleSearch);

// Gelişmiş arama ve filtreleme
router.get("/search/advanced", movieController.searchMovies);

// Kimlik doğrulama gerektiren route'lar
// Kullanıcının izlediği filmler için özel route (my-movies)
router.get("/my-movies", authenticateToken, watchedController.getMyMovies);

// Film önerileri - kimlik doğrulaması gerektirir
router.get(
  "/recommendations",
  authenticateToken,
  recommendationController.getRecommendations
);

// Öneri önbelleğini temizleme - kimlik doğrulaması gerekir
router.delete(
  "/recommendations/cache",
  authenticateToken,
  recommendationController.clearRecommendationsCache
);

// İzlenen filmler endpoints - DİKKAT: Bunlar :id parametresinden önce olmalı
router.get(
  "/user/watched",
  authenticateToken,
  watchedController.getWatchedMovies
);
router.post(
  "/user/watched/:id",
  authenticateToken,
  watchedController.addToWatched
);
router.delete(
  "/user/watched/:id",
  authenticateToken,
  watchedController.removeFromWatched
);

// Film detayı - herkes erişebilir - Bu her zaman en sonda olmalı
// Çünkü "/:id" route'u daha spesifik route'ları maskeleyebilir (örn: "/user/watched")
router.get("/:id", movieController.getMovieById);

module.exports = router;
