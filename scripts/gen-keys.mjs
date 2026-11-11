import { generateKeyPairSync } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const b64 = (s) => Buffer.from(s).toString("base64");
console.log(`LICENSE_PRIVATE_KEY_B64=${b64(privateKey.export({ type: "pkcs8", format: "pem" }))}`);
console.log(`LICENSE_PUBLIC_KEY_B64=${b64(publicKey.export({ type: "spki", format: "pem" }))}`);
