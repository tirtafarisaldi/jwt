import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

let oauth2Client = null;

const getOAuth2Client = (redirectUri) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        const error = new Error(
            "OAuth Google tidak dikonfigurasi. Set GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env"
        );
        error.statusCode = 500;
        throw error;
    }

    // Untuk alur setup (redirect_uri diberikan), selalu buat instance baru.
    if (redirectUri) {
        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }

    // Untuk pemakaian normal, gunakan instance cached dengan refresh token.
    if (!oauth2Client) {
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
        oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        if (refreshToken) {
            oauth2Client.setCredentials({ refresh_token: refreshToken });
        }
    }
    return oauth2Client;
};

// Paksa refresh token agar valid (memuat access token baru bila perlu).
const authorize = async () => {
    const client = getOAuth2Client();
    if (!client.credentials || !client.credentials.refresh_token) {
        const error = new Error(
            "Belum ada refresh token Google Drive. Jalankan 'npm run drive:auth' sekali untuk login."
        );
        error.statusCode = 500;
        throw error;
    }
    await client.getAccessToken();
    return client;
};

const getDrive = async () => {
    const client = await authorize();
    return google.drive({ version: "v3", auth: client });
};

export const DRIVE_FOLDER_ID = () => process.env.GOOGLE_DRIVE_FOLDER_ID || null;

export const uploadFileToDrive = async ({ filePath, folderId, name }) => {
    const driveApi = await getDrive();
    const fileMetadata = {
        name: name || path.basename(filePath),
        parents: folderId ? [folderId] : undefined
    };
    const media = {
        mimeType: "application/pdf",
        body: fs.createReadStream(filePath)
    };

    const res = await driveApi.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id,name,webViewLink"
    });

    return {
        id: res.data.id,
        name: res.data.name,
        webViewLink: res.data.webViewLink
    };
};

export const getDriveFileStream = async (fileId) => {
    const driveApi = await getDrive();
    const res = await driveApi.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
    );
    return res.data;
};

export const deleteFileFromDrive = async (fileId) => {
    const driveApi = await getDrive();
    await driveApi.files.delete({ fileId });
};

// Membangun URL otorisasi untuk login satu kali (setup awal).
export const buildAuthUrl = (redirectUri) => {
    const client = getOAuth2Client(redirectUri);
    return client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/drive.file"]
    });
};

// Menukar kode otorisasi menjadi token dan mengembalikan refresh_token.
export const exchangeCode = async (code, redirectUri) => {
    const client = getOAuth2Client(redirectUri);
    const { tokens } = await client.getToken(code);
    return tokens;
};

export const isConfigured = () =>
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN);