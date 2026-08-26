import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Inventory = db.define("inventories", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    stock: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: { min: 0 }
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    information: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    }
}, {
    freezeTableName: true
});

export default Inventory;
