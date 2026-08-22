import Users from "../models/UserModel.js";

export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.sendStatus(204);

        const user = await Users.findOne({ where: { refresh_token: refreshToken } });
        if (!user) return res.sendStatus(204);

        await user.update({ refresh_token: null });
        res.clearCookie("refreshToken");
        return res.sendStatus(200);
    } catch (error) {
        return res.status(500).json({ msg: "Logout gagal" });
    }
};
