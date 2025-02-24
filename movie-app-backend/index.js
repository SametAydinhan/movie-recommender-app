const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt"); //npm install bcrypt https://github.com/kelektiv/node.bcrypt.js
const db = require("./db");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes
app.post('/register', (req, res) => {
    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
    const query2 = "SELECT * FROM users WHERE username = ?";

    db.query(query2, [req.body.username], async (err, rows) => {
      if (err) {
        console.log(err);
      }
      if (rows.length > 0) {
        return res.status(400).send("User already exists");
      }
      if(rows.length === 0){
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        db.query(query, [req.body.username, hashedPassword], (err, rows) => {
          if (err) {
            console.log(err);
          }
          res.send("User created");
        });
      }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
