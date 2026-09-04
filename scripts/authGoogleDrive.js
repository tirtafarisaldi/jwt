// Setup OAuth Google Drive (akun pribadi / Gmail).
// 1) Jalankan: npm run drive:auth
// 2) Buka URL yang dicetak, login dengan Gmail yang punya kuota, izinkan akses.
// 3) Script menangkap kode via callback lokal, menukar jadi token,
//    lalu menyimpan refresh_token ke .env.
import fs from "fs";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(__dirname, "..", process.env.NODE_ENV === "production" ? ".env.production" : ".env.development");
dotenv.config({ path: envFile });

const { buildAuthUrl, exchangeCode } = await import("../config/GoogleDrive.js");

const PORT = Number(process.env.GOOGLE_OAUTH_PORT) || 3090;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const targetEnvFile = envFile;

const force = process.argv.includes("--force");

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Set GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env terlebih dahulu.");
    process.exit(1);
}

// Jika refresh_token sudah tersedia dan tidak dipaksa login ulang,
// lewati alur auth dan lanjut (exit 0) agar `npm start` otomatis start server.
if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN && !force) {
    console.log("GOOGLE_DRIVE_REFRESH_TOKEN sudah ada. Lewati login Google Drive.");
    process.exit(0);
}

const saveRefreshToken = (refreshToken) => {
    if (!refreshToken) {
        console.error("Tidak ada refresh_token didapat. Pastikan prompt=consent & access_type=offline.");
        process.exit(1);
    }
    let content = fs.existsSync(targetEnvFile) ? fs.readFileSync(targetEnvFile, "utf8") : "";
    content = content
        .split("\n")
        .filter((l) => !l.startsWith("GOOGLE_DRIVE_REFRESH_TOKEN="))
        .join("\n")
        .replace(/\n+$/, "");
    const updated = content ? `${content}\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}\n` : `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}\n`;
    fs.writeFileSync(targetEnvFile, updated, "utf8");
    console.log(`\nrefresh_token disimpan ke: ${targetEnvFile}`);
};

const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        if (url.pathname !== "/oauth2callback") {
            res.writeHead(404);
            return res.end("Not found");
        }
        const code = url.searchParams.get("code");
        if (!code) {
            res.writeHead(400);
            return res.end("Missing code");
        }

        const tokens = await exchangeCode(code, REDIRECT);
        saveRefreshToken(tokens.refresh_token);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h3>Sukses! refresh_token tersimpan.</h3><p>Silakan tutup jendela ini dan restart server.</p>");
        console.log("\nLogin Google Drive berhasil.");
        server.close(() => process.exit(0));
    } catch (err) {
        console.error("Gagal menukar kode:", err.message);
        res.writeHead(500);
        res.end("Gagal menukar kode.");
    }
});

const authUrl = buildAuthUrl(REDIRECT);
server.listen(PORT, () => {
    console.log(`Menunggu callback di ${REDIRECT}`);
    console.log("\nBuka URL ini di browser (login dengan Gmail yang punya kuota):\n");
    console.log(`   ${authUrl}\n`);
});
