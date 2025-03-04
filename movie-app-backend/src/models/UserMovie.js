const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Movie = require("./Movie");

const UserMovie = sequelize.define(
  "UserMovie",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
  },
  {
    timestamps: true,
  }
);

// İlişkileri tanımla
User.belongsToMany(Movie, { through: UserMovie });
Movie.belongsToMany(User, { through: UserMovie });

module.exports = UserMovie;
