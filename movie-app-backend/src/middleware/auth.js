const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Ana authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Token'ı header'dan veya cookie'den al
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Yetkilendirme hatası: Token bulunamadı" });
    }

    // Token'ı doğrula
    try {
      console.log("Token doğrulanıyor:", token.substring(0, 15) + "...");
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      );

      console.log("Decoded token:", decoded);

      // userId kontrolü
      if (!decoded.id) {
        console.error("Token'da ID bulunamadı:", decoded);
        return res
          .status(401)
          .json({ message: "Geçersiz token: Kullanıcı ID'si bulunamadı" });
      }

      req.userId = decoded.id;
      console.log("Doğrulanan kullanıcı ID'si:", req.userId);

      // Kullanıcı veritabanında var mı kontrol et
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "Kullanıcı bulunamadı" });
      }

      // Kullanıcıyı req nesnesine ekle (opsiyonel)
      req.user = user;

      next();
    } catch (error) {
      console.error("Token doğrulama hatası:", error);
      return res
        .status(401)
        .json({ message: "Geçersiz veya süresi dolmuş token" });
    }
  } catch (error) {
    console.error("Yetkilendirme middleware hatası:", error);
    return res.status(500).json({ message: "Sunucu hatası" });
  }
};

// Kayıt ve giriş işlemleri için zaten oturum açmamış kullanıcıları kontrol eden middleware
const checkNotAuthenticated = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;

  if (token) {
    try {
      // Token varsa kullanıcı zaten giriş yapmış demektir
      jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      return res
        .status(400)
        .json({ message: "Zaten giriş yapmış durumdasınız" });
    } catch (error) {
      // Token geçersizse devam et
      next();
    }
  } else {
    // Token yoksa devam et
    next();
  }
};

module.exports = {
  authenticateToken,
  checkNotAuthenticated,
};
