import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

const read = (file) => {
    try {
        return dotenv.parse(fs.readFileSync(path.join(root, file)));
    } catch {
        return {};
    }
};

const base = read(".env");
const env = read(envFile);

// Precedence: shell env > file env (dev/prod) > .env (base)
const baseKeys = new Set(Object.keys(base));
for (const [k, v] of Object.entries(base)) {
    if (process.env[k] === undefined) process.env[k] = v;
}
for (const [k, v] of Object.entries(env)) {
    // Jangan timpa variabel yang memang di-set dari shell.
    if (process.env[k] === undefined || baseKeys.has(k)) process.env[k] = v;
}