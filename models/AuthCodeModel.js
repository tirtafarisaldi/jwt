import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const AuthCode = db.define("auth_codes", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { notEmpty: true }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    freezeTableName: true,
    indexes: [
        { fields: ['code'] },
        { fields: ['user_id'] },
        { fields: ['expires_at'] }
    ]
});

export default AuthCode;