const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Links = sequelize.define(
  "Links",
  {
    movieId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    imdbId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tmdbId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "links",
    timestamps: false,
  }
);

module.exports = Links;
