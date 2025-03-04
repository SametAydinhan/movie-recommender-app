const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { ValidationError, Op } = require("sequelize");
const bcrypt = require("bcrypt");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "24h" }
  );
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Kullanıcı adı veya email zaten kullanılıyor mu kontrol et
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        errors: ["Bu kullanıcı adı veya email zaten kullanılıyor"],
      });
    }

    // Şifre validasyonu
    if (!password || password.length < 6) {
      return res.status(400).json({
        errors: ["Şifre en az 6 karakter olmalıdır"],
      });
    }

    // Yeni kullanıcı oluştur (şifre User modeli içindeki hook ile otomatik hashlenir)
    const user = await User.create({
      username,
      email,
      password,
    });

    const token = generateToken(user);

    res.status(200).json({
      message: "Kullanıcı başarıyla oluşturuldu",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        errors: error.errors.map((err) => err.message),
      });
    }
    console.error("Registration error:", error);
    res.status(500).json({
      errors: ["Kayıt işlemi sırasında bir hata oluştu"],
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    // Kullanıcıyı bul
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      },
    });

    if (!user) {
      return res.status(401).json({
        errors: ["Kullanıcı adı veya şifre hatalı"],
      });
    }

    // Şifreyi kontrol et (User modelindeki validatePassword metodu kullanılıyor)
    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        errors: ["Kullanıcı adı veya şifre hatalı"],
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      errors: ["Giriş işlemi sırasında bir hata oluştu"],
    });
  }
};

User.prototype.validatePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};
