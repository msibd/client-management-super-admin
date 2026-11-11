/**
 * Licence check for a project you deliver. Copy this file into the project (needs `jose`).
 *
 * Environment (shown on the project page in Super Admin):
 *   LICENSE_KEY             the key for this client
 *   LICENSE_SERVER_URL      where Super Admin runs, e.g. https://admin.yourname.com
 *   LICENSE_PUBLIC_KEY_B64  public key, base64 (Settings page)
 *   LICENSE_GRACE_HOURS     optional, default 72: keep running this long if the server is unreachable
 *
 * Usage in a Next.js server component or route handler:
 *   const lic = await checkLicense(headers().get("host") ?? "");
 *   if (!lic.ok) return <LicenseBlocked reason={lic.reason} />;
 */
import { importSPKI, jwtVerify } from "jose";

type Verdict = { ok: boolean; reason?: string; warning?: string };

const g = globalThis as unknown as { __lic?: { at: number; verdict: Verdict; host: string } };
const REFRESH_MS = 30 * 60 * 1000; // ask the server at most every 30 minutes per host

export async function checkLicense(host: string, version = process.env.npm_package_version): Promise<Verdict> {
  const key = process.env.LICENSE_KEY;
  const server = process.env.LICENSE_SERVER_URL;
  const pubB64 = process.env.LICENSE_PUBLIC_KEY_B64;
  if (!key || !server || !pubB64) return { ok: false, reason: "licence_not_configured" };

  const cached = g.__lic;
  if (cached && cached.host === host && Date.now() - cached.at < REFRESH_MS) return cached.verdict;

  const graceMs = Number(process.env.LICENSE_GRACE_HOURS ?? 72) * 3600_000;
  try {
    const res = await fetch(`${server.replace(/\/$/, "")}/api/v1/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key, host, version }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const body = (await res.json()) as { token?: string; valid?: boolean; reason?: string };
    if (!body.token) return remember(host, { ok: false, reason: body.reason ?? "unknown_key" });

    // The answer must be signed by your private key, so a copy cannot fake an approval.
    const pem = Buffer.from(pubB64, "base64").toString("utf8");
    const { payload } = await jwtVerify(body.token, await importSPKI(pem, "EdDSA"), { algorithms: ["EdDSA"] });
    if (payload.host !== host.toLowerCase().replace(/^www\./, "").replace(/:\d+$/, "")) {
      return remember(host, { ok: false, reason: "token_for_other_host" });
    }
    return remember(host, { ok: payload.valid === true, reason: payload.reason as string | undefined, warning: payload.warning as string | undefined });
  } catch {
    // Server unreachable: keep the last known good answer for the grace period.
    if (cached && cached.verdict.ok && Date.now() - cached.at < graceMs) return cached.verdict;
    return { ok: true, warning: "licence_server_unreachable" };
  }
}

function remember(host: string, verdict: Verdict): Verdict {
  g.__lic = { at: Date.now(), verdict, host };
  return verdict;
}
