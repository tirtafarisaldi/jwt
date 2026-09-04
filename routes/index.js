import express from "express";
import { getUsers, CheckUser } from "../controllers/Users.js";
import { refreshToken } from "../controllers/RefreshToken.js";
import { logout } from "../controllers/Logout.js";
import { verifyToken } from "../middleware/VerifyToken.js";
import { verifyApiKey } from "../middleware/VerifyApiKey.js";
import { casLogin, casLogout, casMe, casToken } from "../controllers/CasAuth.js";
import {
    getInventories,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory
} from "../controllers/Inventory.js";
import {
    getSchedules,
    getScheduleById,
    createSchedule,
    updateSchedule,
    deleteSchedule
} from "../controllers/Schedule.js";
import {
    getBookings,
    getBookingById,
    createBooking,
    updateBooking,
    updateBookingStatus,
    getBookingLetter,
    deleteBooking,
    uploadLetter
} from "../controllers/Booking.js";

const router = express.Router();

router.get('/users', verifyApiKey, verifyToken, getUsers);

router.get('/token',     verifyApiKey, refreshToken);
router.delete('/logout', verifyApiKey, verifyToken, logout);
router.get('/checkuser', verifyApiKey, verifyToken, CheckUser);

router.get('/auth/cas/login', casLogin);
router.get('/auth/cas/token', verifyApiKey, casToken);
router.get('/auth/cas/logout', casLogout);
router.get('/auth/cas/me', verifyApiKey, verifyToken, casMe);

router.get('/inventories', verifyApiKey, verifyToken, getInventories);
router.get('/inventory/:id', verifyApiKey, verifyToken, getInventoryById);
router.post('/inventory', verifyApiKey, verifyToken, createInventory);
router.put('/inventory/:id', verifyApiKey, verifyToken, updateInventory);
router.delete('/inventory/:id', verifyApiKey, verifyToken, deleteInventory);

router.get('/schedules', verifyApiKey, verifyToken, getSchedules);
router.get('/schedule/:id', verifyApiKey, verifyToken, getScheduleById);
router.post('/schedule', verifyApiKey, verifyToken, createSchedule);
router.put('/schedule/:id', verifyApiKey, verifyToken, updateSchedule);
router.delete('/schedule/:id', verifyApiKey, verifyToken, deleteSchedule);

router.get('/bookings', verifyApiKey, verifyToken, getBookings);
router.get('/booking/:id', verifyApiKey, verifyToken, getBookingById);
router.get('/booking/:id/letter', verifyApiKey, verifyToken, getBookingLetter);
router.post('/booking', verifyApiKey, verifyToken, uploadLetter.single('letter'), createBooking);
router.put('/booking/:id', verifyApiKey, verifyToken, uploadLetter.single('letter'), updateBooking);
router.patch('/booking/:id/status', verifyApiKey, verifyToken, updateBookingStatus);
router.delete('/booking/:id', verifyApiKey, verifyToken, deleteBooking);

export default router;
