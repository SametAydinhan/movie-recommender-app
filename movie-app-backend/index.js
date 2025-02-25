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
app.use(expressSession({secret: 'cairocoders-ednalan', resave: false, saveUninitialized: false}));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(cookieParser("cairocoders-ednalan"));

app.use(passport.initialize());
app.use(passport.session());
require("./passportConfig")(passport);

// routes
app.post("/register", async (req, res) => {
  console.log("Gelen veriler:", req.body);
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("Lütfen tüm alanları doldurun.");
  }

  const checkUserQuery = "SELECT * FROM users WHERE username = ? OR email = ?";
  const insertUserQuery =
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";

  db.query(checkUserQuery, [username, email], async (err, rows) => {
    if (err) {
      console.error("Veritabanı hatası:", err);
      return res.status(500).send("Sunucu hatası.");
    }

    if (rows.length > 0) {
      return res
        .status(400)
        .send("Bu kullanıcı adı veya email zaten kullanılıyor.");
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(insertUserQuery, [username, email, hashedPassword], (err) => {
        if (err) {
          console.error("Kullanıcı eklenirken hata oluştu:", err);
          return res.status(500).send("Kayıt işlemi başarısız.");
        }
        res.send("Kullanıcı başarıyla oluşturuldu.");
      });
    } catch (hashError) {
      console.error("Şifre hashleme hatası:", hashError);
      res.status(500).send("Şifre işlenirken hata oluştu.");
    }
  });
});

app.post("/login", async (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.log(err);
      return next(err);
    }
    if (!user) {
      return res.status(400).send("Kullanıcı adı veya şifre hatalı.");
    }
    req.login(user, (err) => {
      if (err) {
        console.log(err);
        return next(err);
      }
      res.send("Giriş başarılı.");
      console.log(user);
    });
  })(req, res, next);
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
