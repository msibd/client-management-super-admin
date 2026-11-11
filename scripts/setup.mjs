// Creates .env.local with fresh secrets. Safe to re-run: it refuses to overwrite.
import { existsSync, writeFileSync } from "node:fs";
import { generateKeyPairSync, randomBytes, scryptSync } from "node:crypto";

if (existsSync(".env.local")) {
  console.log(".env.local already exists, nothing changed.");
  process.exit(0);
}
const email = process.argv[2] || "admin@localhost.test";
const password = process.argv[3] || randomBytes(12).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64).toString("hex");
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const b64 = (s) => Buffer.from(s).toString("base64");

writeFileSync(
  ".env.local",
  [
    `ADMIN_EMAIL=${email}`,
    `ADMIN_PASSWORD_HASH=scrypt:${salt}:${hash}`,
    `SESSION_SECRET=${randomBytes(32).toString("hex")}`,
    `LICENSE_PRIVATE_KEY_B64=${b64(privateKey.export({ type: "pkcs8", format: "pem" }))}`,
    `LICENSE_PUBLIC_KEY_B64=${b64(publicKey.export({ type: "spki", format: "pem" }))}`,
    `CRON_SECRET=${randomBytes(16).toString("hex")}`,
    "",
  ].join("\n"),
);
// The plain password is written to a local file only (git-ignored), never to the terminal log.
writeFileSync(".first-login.txt", `email: ${email}\npassword: ${password}\n(delete this file after you sign in)\n`);
console.log("Created .env.local and .first-login.txt (both git-ignored).");
