import { randomBytes } from "node:crypto";
import { importPKCS8, SignJWT } from "jose";

export const newLicenseKey = () => `lic_${randomBytes(18).toString("base64url")}`;

/** Lower-case host without scheme, port, path or a leading "www.". */
export function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

/** Local development hosts never count as a second deployment. */
export const isLocalHost = (h: string) =>
  h === "localhost" || h === "::1" || h.startsWith("127.") || h.endsWith(".localhost") || h.endsWith(".local");

export type Verdict = { valid: boolean; reason?: string; warning?: string };

const TOKEN_HOURS = 48;

/** Signed answer the client project verifies offline with the public key. */
export async function signVerdict(licenseId: string, host: string, v: Verdict) {
  const pem = Buffer.from(process.env.LICENSE_PRIVATE_KEY_B64 ?? "", "base64").toString("utf8");
  if (!pem) throw new Error("LICENSE_PRIVATE_KEY_B64 is missing. Run `npm run setup`.");
  const key = await importPKCS8(pem, "EdDSA");
  return new SignJWT({ lid: licenseId, host, valid: v.valid, reason: v.reason, warning: v.warning })
    .setProtectedHeader({ alg: "EdDSA" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_HOURS}h`)
    .sign(key);
}

export const publicKeyPem = () => Buffer.from(process.env.LICENSE_PUBLIC_KEY_B64 ?? "", "base64").toString("utf8");
