const User = require("./User");
const Movie = require("./Movie");
const Review = require("./Review");
const UserMovie = require("./UserMovie");

// İlişkileri tanımla
User.belongsToMany(Movie, { through: UserMovie });
Movie.belongsToMany(User, { through: UserMovie });

User.hasMany(Review);
Movie.hasMany(Review);
Review.belongsTo(User);
Review.belongsTo(Movie);

module.exports = {
  User,
  Movie,
  Review,
  UserMovie,
};
