const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Movie = require("./Movie");

const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
  }
);

// İlişkileri tanımla
User.hasMany(Review);
Movie.hasMany(Review);
Review.belongsTo(User);
Review.belongsTo(Movie);

module.exports = Review;
