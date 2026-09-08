import crypto from "crypto";
import AuthCode from "../models/AuthCodeModel.js";

const CODE_TTL_MS = 5 * 60 * 1000;

export const createAuthCode = async (userId, refreshToken) => {
    await AuthCode.destroy({ where: { user_id: userId } });
    const code = crypto.randomBytes(16).toString("hex");
    await AuthCode.create({
        code,
        user_id: userId,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + CODE_TTL_MS)
    });
    return code;
};

export const redeemAuthCode = async (rawCode) => {
    const code = typeof rawCode === "string" ? rawCode.trim() : "";
    if (!code) return null;
    const record = await AuthCode.findOne({ where: { code } });
    if (!record) return null;
    if (record.expires_at <= new Date()) {
        await record.destroy();
        return null;
    }
    await record.destroy();
    return { userId: record.user_id, refreshToken: record.refresh_token };
};