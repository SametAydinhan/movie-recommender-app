const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const MoviesMetaData = require("./MoviesMetaData");

const UserMovie = sequelize.define(
  "UserMovie",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    UserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    MoviesMetaDataId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: MoviesMetaData,
        key: "id",
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "watched",
      validate: {
        isIn: [["watched", "watchlist"]],
      },
    },
  },
  {
    tableName: "UserMovies",
    timestamps: true,
    indexes: [
      // Sadece gerekli indeksleri ekleyelim
      {
        unique: true,
        fields: ["UserId", "MoviesMetaDataId"],
      },
    ],
  }
);

// İlişki tanımlamaları
User.belongsToMany(MoviesMetaData, {
  through: UserMovie,
  foreignKey: "UserId",
  otherKey: "MoviesMetaDataId",
});

MoviesMetaData.belongsToMany(User, {
  through: UserMovie,
  foreignKey: "MoviesMetaDataId",
  otherKey: "UserId",
});

// Doğrudan modellere erişim için
UserMovie.belongsTo(User, { foreignKey: "UserId" });
UserMovie.belongsTo(MoviesMetaData, { foreignKey: "MoviesMetaDataId" });

User.hasMany(UserMovie, { foreignKey: "UserId" });
MoviesMetaData.hasMany(UserMovie, { foreignKey: "MoviesMetaDataId" });

module.exports = UserMovie;
