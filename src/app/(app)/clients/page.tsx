import type { Metadata } from "next";
import Link from "next/link";
import { createClientAction } from "@/app/actions";
import { Icon } from "@/components/icons";
import { requireSession } from "@/lib/auth";
import { ago } from "@/lib/format";
import { listClients } from "@/lib/queries";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requireSession();
  const clients = await listClients();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Clients</h1>
          <p>The people and businesses you delivered projects to.</p>
        </div>
      </div>

      <section className="card">
        <div className="card-body">
          <details open={clients.length === 0}>
            <summary><Icon name="plus" sm />Add a client</summary>
            <form action={createClientAction} className="form-grid" style={{ marginTop: 16 }}>
              <label className="field"><span>Name</span><input className="input" name="name" required maxLength={80} /></label>
              <label className="field"><span>Contact <small>(optional)</small></span><input className="input" name="contact" maxLength={120} placeholder="Phone or email" /></label>
              <label className="field wide"><span>Notes <small>(optional)</small></span><textarea className="textarea" name="notes" maxLength={500} /></label>
              <div className="wide"><button className="btn primary">Add client</button></div>
            </form>
          </details>
        </div>
      </section>

      <section className="card">
        {clients.length ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Contact</th><th>Projects</th><th>Added</th></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/clients/${c.id}`}><strong>{c.name}</strong></Link></td>
                    <td className="muted">{c.contact || "—"}</td>
                    <td>{Number(c.project_count)}</td>
                    <td className="muted">{ago(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><strong>No clients yet</strong>Add your first client above.</div>
        )}
      </section>
    </div>
  );
}
