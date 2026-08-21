export const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ msg: 'API key is required' });
    }

    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({ msg: 'Invalid API key' });
    }

    next();
};
