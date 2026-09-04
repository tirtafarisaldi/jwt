import jwt from "jsonwebtoken";
import Users from "../models/UserModel.js";
import cas from "../config/CasAuth.js";

const FRONTEND_URL = process.env.FRONTEND_URL

const getAttr = (info, key) => {
    if (!info || typeof info !== 'object') return undefined;
    const lower = Object.keys(info).find(k => k.toLowerCase() === key.toLowerCase());
    if (lower === undefined) return undefined;
    const value = info[lower];
    if (value && typeof value === 'object') {
        return value._ || value['#text'] || JSON.stringify(value);
    }
    return typeof value === 'string' ? value : String(value);
};

const setRefreshCookie = (res, refreshToken) => {
    const isSecure = process.env.SECURE_COOKIE === "true";
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000
    });
};


const buildAuthRedirect = async (req, res) => {
    try {
        const username = req.session[cas.session_name];
        const info = req.session[cas.session_info];
        console.log('[CAS] username :', username);
        console.log('[CAS] info     :', JSON.stringify(info));
        if (!username) {
            return res.redirect(`${FRONTEND_URL}?error=authentication_failed`);
        }

        const name = getAttr(info, 'name') || getAttr(info, 'cn') || username;
        const email = getAttr(info, 'email')
            || getAttr(info, 'mail')
            || getAttr(info, 'netid')
            || '';

        let user = await Users.findOne({ where: { email } });
        if (user) {
            if (user.name !== name) {
                await user.update({ name });
            }
        } else {
            user = await Users.create({ name, email });
        }

        const payload = { userId: user.id, name: user.name, email: user.email };
        const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" });

        await user.update({ refresh_token: refreshToken });
        setRefreshCookie(res, refreshToken);

        delete req.session[cas.session_name];
        delete req.session[cas.session_info];

        return res.redirect(`${FRONTEND_URL}`);
    } catch (error) {
        console.error('CAS callback error:', error);
        return res.redirect(`${FRONTEND_URL}?error=server_error`);
    }
};


export const casLogin = (req, res, next) => {
    cas.bounce(req, res, () => {
        buildAuthRedirect(req, res);
    });
};

export const casToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) return res.sendStatus(401);

        const user = await Users.findOne({ where: { refresh_token: refreshToken } });
        if (!user) return res.sendStatus(403);

        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
            if (err) return res.sendStatus(403);
            const accessToken = jwt.sign(
                { userId: user.id, name: user.name, email: user.email },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "1d" }
            );
            return res.json({
                accessToken,
                user: { id: user.id, name: user.name, email: user.email, role: user.role }
            });
        });
    } catch (error) {
        console.error('CAS token error:', error);
        return res.status(500).json({ msg: "Gagal memuat sesi" });
    }
};

export const casLogout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            const user = await Users.findOne({ where: { refresh_token: refreshToken } });
            if (user) {
                await user.update({ refresh_token: null });
            }
        }
        res.clearCookie("refreshToken");
    } catch (error) {
        console.error('CAS logout cleanup error:', error);
    }

    // Hapus key sesi CAS (setara dengan cas.logout destroy_session: false).
    delete req.session[cas.session_name];
    delete req.session[cas.session_info];
    if (typeof req.session.save === 'function') {
        req.session.save(() => {});
    }

    // Redirect ke halaman logout CAS dengan parameter `service` sehingga CAS
    // mengarahkan user kembali ke frontend setelah logout.
    const casLogoutUrl = `${process.env.CAS_URL}/logout?service=${encodeURIComponent(FRONTEND_URL)}`;
    res.redirect(casLogoutUrl);
};


export const casMe = async (req, res) => {
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