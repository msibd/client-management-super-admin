import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Icon } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <div className="login">
      <aside className="login-aside">
        <div className="brand">
          <span className="brand-mark"><Icon name="shield" /></span>
          <span>Super Admin</span>
        </div>
        <div>
          <h1>See every client project and who is running it.</h1>
          <p>Check that projects are up, spot a second copy of a delivered project, and block it from one place.</p>
        </div>
        <small className="muted">Authorised use only.</small>
      </aside>
      <main className="login-main">
        <LoginForm />
      </main>
    </div>
  );
}
