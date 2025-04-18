const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Database
const sequelize = require("./config/database");
const models = require("./models"); // Modelleri import et

// Routes
const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// CORS Ayarları - Frontend 3000 portunda, Backend 3001 portunda
const corsOptions = {
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Önemli: cookies paylaşımı için gerekli
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug Middleware
app.use((req, res, next) => {
  console.log(`Gelen istek: ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/users", userRoutes);

// Route testi için basit bir endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "API bağlantı testi başarılı", status: "success" });
});

// Veritabanı senkronizasyonu
(async () => {
  try {
    // Veritabanı senkronizasyon hatalarını ele al
    try {
      // Dikkatli ve güvenli güncelleme - sadece değişiklikleri yapar, verileri korur
      console.log(
        "Veritabanı tabloları sadece yeni değişiklikler için kontrol ediliyor..."
      );
      await sequelize.sync();
      console.log("Veritabanı başarıyla senkronize edildi.");
    } catch (error) {
      console.error("Veritabanı senkronizasyonu başarısız oldu:", error.name);
      console.error("Hata detayı:", error.parent?.code || error.message);
      console.log(
        "Uyarı: Senkronizasyon hatası oluştu ancak uygulama çalışmaya devam edecek."
      );
    }

    // Port dinlemeye başla
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(
        `Server ${PORT} portunda çalışıyor - http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Sunucu başlatılamadı:", error);
  }
})();

module.exports = app;
