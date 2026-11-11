import { NextResponse } from "next/server";
import { signVerdict } from "@/lib/license";
import { verifyCheckIn } from "@/lib/queries";

/**
 * Public endpoint that delivered projects call. Body: { key, host, version? }.
 * The answer is a signed token: a copy cannot fake an "approved" reply without the private key.
 */
export async function POST(request: Request) {
  let body: { key?: unknown; host?: unknown; version?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, reason: "bad_request" }, { status: 400 });
  }
  const key = typeof body.key === "string" ? body.key : "";
  const host = typeof body.host === "string" ? body.host.slice(0, 253) : "";
  const version = typeof body.version === "string" ? body.version.slice(0, 40) : undefined;
  if (!key || !host) return NextResponse.json({ valid: false, reason: "bad_request" }, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  const result = await verifyCheckIn({ key, host, version, ip });
  if (!result) return NextResponse.json({ valid: false, reason: "unknown_key" }, { status: 404 });

  const token = await signVerdict(result.licenseId, result.host, result.verdict);
  return NextResponse.json(
    { valid: result.verdict.valid, reason: result.verdict.reason, warning: result.verdict.warning, token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
