import Users from "../models/UserModel.js";

export const getUsers = async (req, res) => {
    try {
        const users = await Users.findAll({
            attributes: ["id", "name", "email"]
        });

        return res.json(users);
    } catch (error) {
        return res.status(500).json({ msg: "Gagal mengambil data user" });
    }
};
