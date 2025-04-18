const { User, UserMovie, MoviesMetaData } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Kullanıcı kaydı oluştur
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Gerekli alanları kontrol et
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tüm alanları doldurun." });
    }

    // E-posta formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Geçerli bir e-posta adresi girin." });
    }

    // Kullanıcı adı veya e-posta zaten var mı kontrol et
    const existingUser = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Bu kullanıcı adı veya e-posta zaten kullanılıyor." });
    }

    // Yeni kullanıcı oluştur
    const newUser = await User.create({
      username,
      email,
      password, // Model hooks şifreyi otomatik olarak hashleyecek
    });

    // Kullanıcı verilerini döndür (şifre hariç)
    const userData = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
    };

    // JWT token oluştur
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET || "gizli_anahtar",
      { expiresIn: "7d" }
    );

    // Yanıt gönder
    res.status(201).json({
      message: "Kullanıcı başarıyla oluşturuldu.",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("Kullanıcı kaydı oluşturulurken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// Kullanıcı girişi
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Gerekli alanları kontrol et
    if (!email || !password) {
      return res.status(400).json({ message: "E-posta ve şifre gereklidir." });
    }

    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Geçersiz e-posta veya şifre." });
    }

    // Şifreyi kontrol et
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Geçersiz e-posta veya şifre." });
    }

    // Kullanıcı verilerini döndür (şifre hariç)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    // JWT token oluştur
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "gizli_anahtar",
      { expiresIn: "7d" }
    );

    // Yanıt gönder
    res.json({
      message: "Giriş başarılı.",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("Kullanıcı girişi sırasında hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// Mevcut kullanıcı bilgilerini getir
exports.getCurrentUser = async (req, res) => {
  try {
    // Auth middleware'den gelen kullanıcı ID'si
    const userId = req.userId;

    // Kullanıcıyı bul
    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email", "createdAt", "updatedAt"],
    });

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    // Kullanıcı verilerini döndür
    res.json({
      user,
    });
  } catch (error) {
    console.error("Kullanıcı bilgileri alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// Kullanıcı bilgilerini güncelle
exports.updateUser = async (req, res) => {
  try {
    // Auth middleware'den gelen kullanıcı ID'si
    const userId = req.userId;
    const { username, email, password } = req.body;

    // Kullanıcıyı bul
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    // Değiştirilecek alanları güncelle
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = password; // Model hooks şifreyi otomatik olarak hashleyecek

    // Değişiklikleri kaydet
    await user.save();

    // Güncellenmiş kullanıcı verilerini döndür (şifre hariç)
    const updatedUserData = {
      id: user.id,
      username: user.username,
      email: user.email,
      updatedAt: user.updatedAt,
    };

    // Yanıt gönder
    res.json({
      message: "Kullanıcı bilgileri başarıyla güncellendi.",
      user: updatedUserData,
    });
  } catch (error) {
    console.error("Kullanıcı bilgileri güncellenirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// İzleme listesine film ekle
exports.addToWatchlist = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.userId; // Auth middleware'den gelen kullanıcı ID'si

    if (!movieId) {
      return res.status(400).json({ message: "Film ID'si gereklidir." });
    }

    // Kullanıcı-film bağlantısını oluştur
    const userMovie = await UserMovie.create({
      UserId: userId,
      MoviesMetaDataId: movieId,
      status: "watchlist", // izleme listesinde olduğunu belirt
    });

    res.status(201).json({
      message: "Film başarıyla izleme listesine eklendi.",
      userMovie,
    });
  } catch (error) {
    console.error("İzleme listesine film eklenirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// İzleme listesinden film çıkar
exports.removeFromWatchlist = async (req, res) => {
  try {
    const { movieId } = req.params;
    const userId = req.userId; // Auth middleware'den gelen kullanıcı ID'si

    if (!movieId) {
      return res.status(400).json({ message: "Film ID'si gereklidir." });
    }

    // İlgili bağlantıyı bul ve sil
    const deleted = await UserMovie.destroy({
      where: {
        UserId: userId,
        MoviesMetaDataId: movieId,
        status: "watchlist",
      },
    });

    if (deleted === 0) {
      return res
        .status(404)
        .json({ message: "Film izleme listenizde bulunamadı." });
    }

    res.status(200).json({
      message: "Film izleme listenizden çıkarıldı.",
    });
  } catch (error) {
    console.error("Film izleme listesinden çıkarılırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// Kullanıcının izleme listesini getir
exports.getWatchlist = async (req, res) => {
  try {
    const userId = req.userId; // Auth middleware'den gelen kullanıcı ID'si

    // Kullanıcının izleme listesindeki filmleri bul
    const watchlist = await UserMovie.findAll({
      where: {
        UserId: userId,
        status: "watchlist",
      },
      include: [
        {
          model: MoviesMetaData,
          attributes: [
            "id",
            "title",
            "poster_path",
            "vote_average",
            "release_date",
          ],
        },
      ],
    });

    res.status(200).json({
      watchlist: watchlist.map((item) => item.MoviesMetaData),
    });
  } catch (error) {
    console.error("İzleme listesi alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
};
