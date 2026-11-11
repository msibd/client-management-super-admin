"use server";

import { redirect } from "next/navigation";
import { clearFailures, clientIp, createSession, recordFailure, tooManyAttempts, verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = await clientIp();

  if (await tooManyAttempts(ip)) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again." };
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  // Always run the hash check so timing does not reveal whether the email exists.
  const passwordOk = verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
  if (!adminEmail || email !== adminEmail || !passwordOk) {
    await recordFailure(ip);
    return { error: "Email or password is incorrect." };
  }

  await clearFailures(ip);
  await createSession(adminEmail);
  redirect("/");
}
