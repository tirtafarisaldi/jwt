import express from "express";
import { getUsers, Register, Login, Logout } from "../controllers/Users.js";
import { verifyToken } from "../middleware/VerifyToken.js";
import { verifyApiKey } from "../middleware/VerifyApiKey.js";
import { refreshToken } from "../controllers/RefreshToken.js";
import {
    getInventories,
    getInventoryById,
    createInventory,
    updateInventory,
    deleteInventory
} from "../controllers/Inventory.js";

const router = express.Router();

router.get('/users', verifyApiKey, verifyToken, getUsers);
router.post('/register', verifyApiKey, Register);
router.post('/login', verifyApiKey, Login);
router.get('/token', verifyApiKey, refreshToken);
router.delete('/logout', verifyApiKey, verifyToken, Logout);

router.get('/inventories', verifyApiKey, verifyToken, getInventories);
router.get('/inventory/:id', verifyApiKey, verifyToken, getInventoryById);
router.post('/inventory', verifyApiKey, verifyToken, createInventory);
router.put('/inventory/:id', verifyApiKey, verifyToken, updateInventory);
router.delete('/inventory/:id', verifyApiKey, verifyToken, deleteInventory);

export default router;
