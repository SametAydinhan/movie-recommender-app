const db = require("./db");
const bcrypt = require("bcrypt");
const localStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
  passport.use(
    new localStrategy(
      { usernameField: "usernameOrEmail", passwordField: "password" }, 
      (usernameOrEmail, password, done) => {
        const query = "SELECT * FROM users WHERE username = ? OR email = ?";

        db.query(
          query,
          [usernameOrEmail, usernameOrEmail],
          async (err, rows) => {
            if (err) {
              return done(err);
            }
            if (rows.length === 0) {
              return done(null, false, {
                message: "Kullanıcı adı veya şifre hatalı.",
              });
            }

            bcrypt.compare(password, rows[0].password, (err, isMatch) => {
              if (err) {
                return done(err);
              }
              if (isMatch) {
                return done(null, rows[0]);
              } else {
                return done(null, false, {
                  message: "Kullanıcı adı veya şifre hatalı.",
                });
              }
            });
          }
        );
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const query = "SELECT * FROM users WHERE id = ?";
    db.query(query, [id], (err, rows) => {
      if (err) throw err;
      const userInfo = {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
      };
      done(null, userInfo);
    });
  });
};
