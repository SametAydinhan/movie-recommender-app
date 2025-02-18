const express = require("express");
const bodyParser = require("body-parser");
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

    db.query(query, [req.body.username, req.body.password], (err, rows) => {
        if(err){
            console.log(err);
        }
        res.send("User created");
    });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
