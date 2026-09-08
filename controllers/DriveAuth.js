import { buildAuthUrl, exchangeCode, saveDriveRefreshToken } from "../config/GoogleDrive.js";

const callbackPath = "/drive/setup/callback";

// Mulai alur re-auth: redirect ke Google consent, callback kembali ke endpoint ini.
export const driveSetup = (req, res) => {
    const redirectUri = `${req.protocol}://${req.get("host")}${callbackPath}`;
    return res.redirect(buildAuthUrl(redirectUri));
};

export const driveSetupCallback = async (req, res) => {
    try {
        const code = req.query.code;
        if (!code) {
            return res.status(400).send("Missing code");
        }
        const redirectUri = `${req.protocol}://${req.get("host")}${callbackPath}`;
        const tokens = await exchangeCode(code, redirectUri);
        if (!tokens.refresh_token) {
            return res.status(400).send(
                "Tidak ada refresh_token yang diterima. Pastikan prompt=consent dan access_type=offline dipakai."
            );
        }
        await saveDriveRefreshToken(tokens.refresh_token);
        console.log("Google Drive refresh token diperbarui via /drive/setup");
        return res.status(200).send(
            "<h3>Sukses!</h3><p>Refresh token Google Drive tersimpan. Silakan tutup jendela ini dan tes upload lagi.</p>"
        );
    } catch (error) {
        console.error("drive setup callback error:", error);
        return res.status(500).send(`Gagal menyimpan refresh token: ${error.message}`);
    }
};