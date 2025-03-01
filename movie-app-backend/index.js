const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const passport = require("passport");
const expressSession = require("express-session");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const db = require("./db");
const app = express();
const port = 3001;
const jwt = require("jsonwebtoken");

// JWT için secret key'i tanımlayalım
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; // Gerçek uygulamada .env dosyasında saklanmalı

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  expressSession({
    secret: "cairocoders-ednalan",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(cookieParser("cairocoders-ednalan"));

app.use(passport.initialize());
app.use(passport.session());
require("./passportConfig")(passport);

// Validasyon fonksiyonları
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

// routes
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  // Backend validasyonu
  const errors = [];

  // Kullanıcı adı validasyonu
  if (!username || username.length < 3) {
    errors.push("Kullanıcı adı en az 3 karakter olmalıdır");
  }

  // Email validasyonu
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push("Geçerli bir email adresi giriniz");
  }

  // Şifre validasyonu
  if (!password || password.length < 6) {
    errors.push("Şifre en az 6 karakter olmalıdır");
  }

  // Validasyon hataları varsa
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    // Önce kullanıcı var mı kontrol et
    db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email],
      async (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ errors: ["Veritabanı hatası"] });
        }

        if (rows.length > 0) {
          return res.status(400).json({
            errors: ["Bu kullanıcı adı veya email zaten kullanılıyor"],
          });
        }

        // Şifreyi hashle
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yeni kullanıcıyı kaydet
        db.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              console.error("Insert error:", err);
              return res.status(500).json({
                errors: ["Kayıt işlemi sırasında bir hata oluştu"],
              });
            }

            // JWT token oluştur
            const token = jwt.sign(
              { id: result.insertId, username, email },
              JWT_SECRET,
              { expiresIn: "24h" }
            );

            // Başarılı yanıt
            res.status(200).json({
              message: "Kullanıcı başarıyla oluşturuldu",
              token,
              user: {
                id: result.insertId,
                username,
                email,
              },
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      errors: ["Kayıt işlemi sırasında bir hata oluştu"],
    });
  }
});

app.post("/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  // Backend validasyonu
  if (!usernameOrEmail || !password) {
    return res.status(400).json({
      errors: ["Tüm alanları doldurunuz"],
    });
  }

  try {
    const query = "SELECT * FROM users WHERE username = ? OR email = ?";
    db.query(query, [usernameOrEmail, usernameOrEmail], async (err, rows) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ errors: ["Veritabanı hatası"] });
      }

      if (!rows || rows.length === 0) {
        return res
          .status(401)
          .json({ errors: ["Kullanıcı adı veya şifre hatalı"] });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(401)
          .json({ errors: ["Kullanıcı adı veya şifre hatalı"] });
      }

      // JWT token oluştur
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(200).json({
        message: "Giriş başarılı",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ errors: ["Giriş işlemi sırasında bir hata oluştu"] });
  }
});

app.get("/getUser", (req, res) => {
  if (req.isAuthenticated()) {
    return res.send(req.user);
  }
  res.status(401).send("Giriş yapmamış kullanıcılar bu alana erişemez.");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
