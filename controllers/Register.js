import bcrypt from "bcrypt";
import Users from "../models/UserModel.js";

export const register = async (req, res) => {
    const { name, email, password, confPassword } = req.body;

    if (password !== confPassword) {
        return res.status(400).json({ msg: "Password dan Confirm Password tidak cocok" });
    }

    try {
        const hashPassword = await bcrypt.hash(password, await bcrypt.genSalt());
        await Users.create({ name, email, password: hashPassword });
        return res.json({ msg: "Register Berhasil" });
    } catch (error) {
        return res.status(400).json({ msg: "Registrasi gagal", error: error.errors?.[0]?.message });
    }
};
