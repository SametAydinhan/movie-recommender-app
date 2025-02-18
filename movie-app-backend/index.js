const express = require("express");
const app = express();
const port = 3001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// routes
app.post('/register', (req, res) => {
    
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
