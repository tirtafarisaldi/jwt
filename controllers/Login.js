import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Users from "../models/UserModel.js";

export const login = async (req, res) => {
    try {
        const user = await Users.findOne({ where: { email: req.body.email } });
        if (!user) return res.status(404).json({ msg: "Email tidak ditemukan" });

        const match = await bcrypt.compare(req.body.password, user.password);
        if (!match) return res.status(400).json({ msg: "Wrong Password" });

        const payload = { userId: user.id, name: user.name, email: user.email };
        const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "20s" });
        const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" });

        await user.update({ refresh_token: refreshToken });
        res.cookie("refreshToken", refreshToken, { 
            httpOnly: true, 
            secure: process.env.SECURE_COOKIE,
            sameSite: "none", 
            maxAge: 24 * 60 * 60 * 1000 
        });
        return res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        return res.status(500).json({ msg: "Login gagal" });
    }
};
