import jwt from "jsonwebtoken";
import Users from "../models/UserModel.js";

export const checkUser = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) return res.status(401).json({ msg: "Tidak terautentikasi" });

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await Users.findByPk(decoded.userId, {
            attributes: ["id", "name", "email"]
        });

        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
        return res.json(user);
    } catch (error) {
        return res.status(403).json({ msg: "Token tidak valid" });
    }
};
