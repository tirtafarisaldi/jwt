import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import db from "./config/Database.js";
import router from "./routes/index.js";
import Inventory from "./models/InventoryModel.js";
import Schedule from "./models/ScheduleModel.js";
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });
const app = express();

try {
    await db.authenticate();
    await Inventory.sync({ alter: true });
    await Schedule.sync({ alter: true });
    console.log('Database Connected...');
} catch (error) {
    console.error(error);
}

const corsOptions = {
    credentials: true,
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(router);

app.listen(3000, ()=> console.log('Server running at port 3000'));
