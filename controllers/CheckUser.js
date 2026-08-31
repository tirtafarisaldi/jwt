import Users from "../models/UserModel.js";

export const checkUser = async (req, res) => {
    try {
        const user = await Users.findByPk(req.userId, {
            attributes: ["id", "name", "email", "role"]
        });

        if (!user) return res.status(404).json({ msg: "User tidak ditemukan" });
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ msg: "Gagal memuat user" });
    }
};