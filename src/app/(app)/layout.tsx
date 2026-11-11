import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { ThemeToggle } from "@/components/client-bits";
import { Icon } from "@/components/icons";
import { Nav } from "@/components/nav";
import { requireSession } from "@/lib/auth";
import { overviewCounts } from "@/lib/queries";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const { openAlerts } = await overviewCounts();
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark"><Icon name="shield" /></span>
          <span>Super Admin<small>Clients and licences</small></span>
        </div>
        <Nav openAlerts={openAlerts} />
        <div className="side-foot">
          <span className="who">{session.email}</span>
          <div className="actions">
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="btn">
                <Icon name="logout" sm />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
