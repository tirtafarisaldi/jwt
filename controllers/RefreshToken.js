import Users from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import { redeemAuthCode } from "../utils/authCode.js";

export const refreshToken = async(req, res) => {
    try {
        const authHeaderToken = req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : undefined;
        const refreshToken = req.cookies.refreshToken
            || authHeaderToken
            || req.headers['x-refresh-token'];

        let user;
        let token;

        if (refreshToken) {
            user = (await Users.findAll({ where: { refresh_token: refreshToken } }))[0];
            if (!user) return res.sendStatus(403);
            token = refreshToken;
        } else {
            const code = req.headers['x-auth-code'] || req.query.code;
            const redeemed = await redeemAuthCode(code);
            if (!redeemed) return res.sendStatus(401);
            user = await Users.findByPk(redeemed.userId);
            if (!user) return res.sendStatus(403);
            token = redeemed.refreshToken;
        }

        jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err) => {
            if (err) return res.sendStatus(403);
            const userId = user.id;
            const name = user.name;
            const email = user.email;
            const accessToken = jwt.sign({ userId, name, email }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            const body = { accessToken };
            // Jika token diperoleh dari kode sekali pakai, kembalikan refresh
            // token ke frontend agar bisa dipakai untuk refresh berikutnya.
            if (!refreshToken) {
                body.refreshToken = token;
                body.user = { id: userId, name, email, role: user.role };
            }
            res.json(body);
        });
    } catch (error) {
        console.log(error);
    }
}