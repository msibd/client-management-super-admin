import { NextResponse } from "next/server";
import { hashToken } from "./auth";
import { findTokenByHash } from "./queries";

/** Returns null when the Bearer token is valid, otherwise a ready-made 401 response. */
export async function requireApiToken(request: Request): Promise<NextResponse | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token && (await findTokenByHash(hashToken(token)))) return null;
  return NextResponse.json({ error: "Missing or invalid API token." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const bad = (message: string, status = 400) => json({ error: message }, status);

/** Hides licence keys unless explicitly asked for. */
export const maskKey = (k: string) => `${k.slice(0, 8)}…${k.slice(-4)}`;
