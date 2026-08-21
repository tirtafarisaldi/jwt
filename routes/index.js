import express from "express";
import { getUsers, Register, Login, Logout } from "../controllers/Users.js";
import { verifyToken } from "../middleware/VerifyToken.js";
import { verifyApiKey } from "../middleware/VerifyApiKey.js";
import { refreshToken } from "../controllers/RefreshToken.js";

const router = express.Router();

router.get('/users', verifyApiKey, verifyToken, getUsers);
router.post('/register', verifyApiKey, Register);
router.post('/login', verifyApiKey, Login);
router.get('/token', verifyApiKey, refreshToken);
router.delete('/logout', verifyApiKey, verifyToken, Logout);

export default router;