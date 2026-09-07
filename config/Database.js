import "./LoadEnv.js";
import {Sequelize} from "sequelize";

const db = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    dialect: process.env.DB_DIALECT || "postgres",
    logging: false,
    dialectOptions: process.env.DB_HOST !== "localhost" ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {},
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    define: {
        timestamps: true,
        freezeTableName: true
    }
});

export default db;