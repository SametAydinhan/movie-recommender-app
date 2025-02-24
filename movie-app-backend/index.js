const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt"); //npm install bcrypt https://github.com/kelektiv/node.bcrypt.js
const db = require("./db");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

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


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
