const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Links = require("./Links");

const MoviesMetaData = sequelize.define(
  "MoviesMetaData",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    adult: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    belongs_to_collection: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    budget: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    genres: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    homepage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imdb_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    original_language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    original_title: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    overview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    popularity: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    poster_path: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    production_companies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    production_countries: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    release_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    revenue: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    runtime: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    spoken_languages: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tagline: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    video: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    vote_average: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    vote_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "movies_metadata",
    timestamps: false,
  }
);

MoviesMetaData.hasOne(Links, {
  foreignKey: "movieId",
  constraints: false,
});

Links.belongsTo(MoviesMetaData, {
  foreignKey: "movieId",
  constraints: false,
});

module.exports = MoviesMetaData;
