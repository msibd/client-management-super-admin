import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, SignJWT } from "jose";
import { all, run } from "./db";

export const SESSION_COOKIE = "sa_session";
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters. Run `npm run setup`.");
  return new TextEncoder().encode(s);
};

/** `scrypt:<salt>:<hash>` check in constant time. Does the same work for unknown accounts. */
export function verifyPassword(password: string, stored: string | undefined): boolean {
  const [scheme, salt, hash] = (stored ?? "scrypt:00:00").split(":");
  const expected = Buffer.from(hash || "00", "hex");
  const actual = scryptSync(password, salt || "00", Math.max(expected.length, 1));
  const same = actual.length === expected.length && timingSafeEqual(actual, expected);
  return scheme === "scrypt" && same && !!stored;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export async function tooManyAttempts(ip: string): Promise<boolean> {
  const since = Date.now() - WINDOW_MS;
  const rows = await all<{ n: number }>("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?", [ip, since]);
  return Number(rows[0]?.n ?? 0) >= MAX_FAILS;
}
export const recordFailure = (ip: string) => run("INSERT INTO login_attempts (ip, at) VALUES (?, ?)", [ip, Date.now()]);
export const clearFailures = (ip: string) => run("DELETE FROM login_attempts WHERE ip = ?", [ip]);

export async function createSession(email: string) {
  const token = await new SignJWT({ sub: email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function getSession(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { email: payload.sub } : null;
  } catch {
    return null;
  }
}

/** Call at the top of every protected page and server action. */
export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/* API tokens let scripts and other projects manage this panel over REST. */
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
export const newToken = () => `sa_${randomBytes(24).toString("base64url")}`;
