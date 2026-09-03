import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import db from "./config/Database.js";
import router from "./routes/index.js";
import Inventory from "./models/InventoryModel.js";
import Schedule from "./models/ScheduleModel.js";
import Booking from "./models/BookingModel.js";
import BookingItem from "./models/BookingItemModel.js";
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });
const app = express();

// Relasi bookings <-> booking_items <-> inventories
Booking.hasMany(BookingItem, { foreignKey: "booking_id", as: "items", onDelete: "CASCADE" });
BookingItem.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingItem.belongsTo(Inventory, { foreignKey: "inventory_id", as: "inventory" });

try {
    await db.authenticate();
    await Inventory.sync({ alter: true });
    await Schedule.sync({ alter: true });
    await Booking.sync({ alter: true });
    await BookingItem.sync({ alter: true });
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

// Handle error (termasuk error upload file dari multer).
app.use((error, req, res, next) => {
    if (error && (error.name === 'MulterError' || error.statusCode)) {
        const message = error.name === 'MulterError'
            ? (error.code === 'LIMIT_FILE_SIZE' ? 'Ukuran surat maksimal 2 MB' : 'Gagal mengunggah surat')
            : (error.message || 'Gagal mengunggah surat');
        return res.status(error.statusCode || 400).json({ msg: message });
    }
    return next(error);
});

app.listen(3000, ()=> console.log('Server running at port 3000'));
