const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token bulunamadı" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(403).json({ message: "Geçersiz token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Geçersiz token" });
  }
};

exports.checkNotAuthenticated = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      return res.status(403).json({
        message: "Zaten giriş yapmış durumdasınız. Önce çıkış yapmalısınız.",
      });
    } catch (error) {
      next();
    }
  } else {
    next();
  }
};
