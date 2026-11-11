import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Optimistic gate: sends visitors without a valid session cookie to /login. Every page and
 * server action re-checks the session itself, so this is a convenience, not the only lock.
 * The public verify endpoint, the Bearer-token admin API and the cron route are excluded.
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("sa_session")?.value;
  if (token && process.env.SESSION_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {
      /* fall through to the redirect */
    }
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api/v1|api/cron|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
