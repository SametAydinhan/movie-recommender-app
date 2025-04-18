const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Credits = sequelize.define(
  "Credits",
  {
    cast: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    crew: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    tableName: "credits",
    timestamps: false,
  }
);

module.exports = Credits;
