import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const [scheme, token] = authHeader?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ msg: 'Bearer token is required' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                msg: err.name === 'TokenExpiredError' ? 'Access token has expired' : 'Invalid access token'
            });
        }

        req.userId = decoded.userId;
        req.email = decoded.email;
        next();
    });
};
