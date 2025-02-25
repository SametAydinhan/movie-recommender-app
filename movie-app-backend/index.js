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

  if (!username || username.length < 3) {
    errors.push("Kullanıcı adı en az 3 karakter olmalıdır");
  }

  if (!validateEmail(email)) {
    errors.push("Geçerli bir email adresi giriniz");
  }

  if (!validatePassword(password)) {
    errors.push("Şifre en az 6 karakter olmalıdır");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email],
      (err, rows) => {
        if (err) {
          return res.status(500).send("Sunucu hatası.");
        }

        if (rows.length > 0) {
          return res
            .status(400)
            .send("Bu kullanıcı adı veya email zaten kullanılıyor.");
        }

        db.query(
          "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
          [username, email, hashedPassword],
          (err, result) => {
            if (err) {
              return res.status(500).send("Kayıt işlemi başarısız.");
            }
            res.status(200).send("Kullanıcı başarıyla oluşturuldu.");
          }
        );
      }
    );
  } catch (error) {
    res.status(500).send("İşlem sırasında hata oluştu.");
  }
});

app.post("/login", (req, res, next) => {
  const { usernameOrEmail, password } = req.body;

  // Backend validasyonu
  const errors = [];

  if (!usernameOrEmail) {
    errors.push("Email veya kullanıcı adı gereklidir");
  } else if (usernameOrEmail.includes("@") && !validateEmail(usernameOrEmail)) {
    errors.push("Geçerli bir email adresi giriniz");
  }

  if (!validatePassword(password)) {
    errors.push("Şifre en az 6 karakter olmalıdır");
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const query = "SELECT * FROM users WHERE username = ? OR email = ?";
  db.query(query, [usernameOrEmail, usernameOrEmail], async (err, rows) => {
    if (err) {
      return res.status(500).send("Veritabanı hatası");
    }

    if (!rows || rows.length === 0) {
      return res.status(401).send("Kullanıcı adı veya şifre hatalı.");
    }

    const user = rows[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        req.logIn(user, (err) => {
          if (err) {
            return res.status(500).send("Oturum başlatılamadı.");
          }
          return res.status(200).json({
            message: "Giriş başarılı",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
            },
          });
        });
      } else {
        return res.status(401).send("Kullanıcı adı veya şifre hatalı.");
      }
    } catch (error) {
      return res.status(500).send("Şifre kontrolü sırasında hata oluştu.");
    }
  });
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
