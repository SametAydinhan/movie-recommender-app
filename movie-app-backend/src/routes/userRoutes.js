const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const watchedController = require("../controllers/watchedController");

// Auth middleware'i yükle (eğer varsa)
let authenticateToken;
try {
  const authMiddleware = require("../middleware/auth");
  authenticateToken = authMiddleware.authenticateToken;
} catch (error) {
  // Middleware bulunamadıysa basit bir geçici middleware oluştur
  authenticateToken = (req, res, next) => {
    console.log(
      "Geçici auth middleware kullanılıyor. Kimlik doğrulama devre dışı."
    );
    req.userId = 1; // Demo için varsayılan kullanıcı ID'si
    next();
  };
}

// Kimlik doğrulama gerektirmeyen routelar
router.post("/register", userController.register);
router.post("/login", userController.login);

// Kimlik doğrulama gerektiren routelar
router.get("/me", authenticateToken, userController.getCurrentUser);
router.put("/me", authenticateToken, userController.updateUser);
router.delete("/me", authenticateToken, userController.deleteUser);

// İzlenen filmler route'ları
router.get("/watched", authenticateToken, watchedController.getWatchedMovies);
router.post("/watched", authenticateToken, watchedController.addWatchedMovie);
router.delete(
  "/watched/:movieId",
  authenticateToken,
  watchedController.removeWatchedMovie
);

// Kullanıcı istatistikleri endpoint'i
router.get("/me/stats", authenticateToken, watchedController.getUserWatchStats);

// Kullanıcı detaylı izlenen filmler route'u
router.get(
  "/:userId/watched",
  authenticateToken,
  watchedController.getUserWatchedMovies
);

// Watchlist route'ları
router.get("/watchlist", authenticateToken, userController.getWatchlist);
router.post("/watchlist", authenticateToken, userController.addToWatchlist);
router.delete(
  "/watchlist/:movieId",
  authenticateToken,
  userController.removeFromWatchlist
);

module.exports = router;
