const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Movie = sequelize.define(
  "Movie",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    api_id: {
      // Filmleri API'den çektiğin için orijinal ID'yi saklamak faydalı olur
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Movie;
