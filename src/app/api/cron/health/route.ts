import { NextResponse } from "next/server";
import { checkAll } from "@/lib/health";

/** Called by Vercel Cron (vercel.json). Set CRON_SECRET to require `Authorization: Bearer <secret>`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ checked: await checkAll() });
}
