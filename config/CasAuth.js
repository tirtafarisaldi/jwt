import dotenv from "dotenv";
import CASAuthentication from "cas-authentication-user";

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

const cas = new CASAuthentication({
    cas_url         : process.env.CAS_URL,
    service_url     : process.env.CAS_SERVICE_URL,
    // PENS CAS (login.pens.ac.id) hanya menyediakan endpoint 2.0
    // (/cas/serviceValidate). Endpoint 3.0 (/cas/p3/serviceValidate) tidak ada
    // sehingga ticket selalu ditolak → 401 Unauthorized.
    cas_version     : "2.0",
    renew           : false,
    // is_dev_mode     : process.env.NODE_ENV !== "production",
    // dev_mode_user   : process.env.DEV_MODE_USER || "dev_user",
    // dev_mode_info   : { username: "dev_user", name: "Developer User", email: "dev@pens.ac.id" },
    session_name    : "cas_user",
    session_info    : "cas_userinfo",
    destroy_session : false
});

export default cas;