import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const Booking = db.define("bookings", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    borrower: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { notEmpty: true }
    },
    type: {
        type: DataTypes.ENUM("equipment", "room"),
        allowNull: false,
        validate: { notEmpty: true }
    },
    letter_file: {
        type: DataTypes.STRING,
        allowNull: true
    },
    title: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    reason_rejected: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    room: {
        type: DataTypes.STRING,
        allowNull: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: { notEmpty: true }
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    start_time: {
        type: DataTypes.STRING,
        allowNull: true
    },
    end_time: {
        type: DataTypes.STRING,
        allowNull: true
    },
    repeat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "none",
        validate: { isIn: [["none", "daily", "weekly", "monthly"]] }
    },
    repeat_end: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM("pending", "reviewing", "approved", "rejected", "completed"),
        allowNull: false,
        defaultValue: "pending"
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_by: {
        type: DataTypes.STRING(36),
        allowNull: true
    },
    updated_by: {
        type: DataTypes.STRING(36),
        allowNull: true
    }
}, {
    freezeTableName: true,
    indexes: [
        { fields: ['borrower'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['date'] }
    ]
});

export default Booking;
