const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Keywords = sequelize.define(
  "Keywords",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    keywords: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "keywords",
    timestamps: false,
  }
);

module.exports = Keywords;
