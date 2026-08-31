import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Schedule = db.define("schedules", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: { notEmpty: true }
    },
    start_time: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    end_time: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    peminjam: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    freezeTableName: true,
    indexes: [
        { fields: ['date'] },
        { fields: ['location'] },
        { fields: ['date', 'location'] }
    ]
});

export default Schedule;