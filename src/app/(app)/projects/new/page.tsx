import type { Metadata } from "next";
import Link from "next/link";
import { createProjectAction } from "@/app/actions";
import { requireSession } from "@/lib/auth";
import { listClients } from "@/lib/queries";

export const metadata: Metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ clientId?: string }> }) {
  await requireSession();
  const { clientId } = await searchParams;
  const clients = await listClients();
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>New project</h1>
          <p>A licence key is created with the project. Add it to the project you deliver.</p>
        </div>
      </div>
      <form action={createProjectAction} className="card card-body">
        <div className="form-grid">
          <label className="field wide">
            <span>Project name</span>
            <input className="input" name="name" required maxLength={80} placeholder="e.g. Dental clinic admin" autoFocus />
          </label>
          <label className="field">
            <span>Who is it for?</span>
            <select className="select" name="kind" defaultValue="delivered">
              <option value="delivered">Delivered to a client</option>
              <option value="own">My own project</option>
            </select>
          </label>
          <label className="field">
            <span>Client</span>
            <select className="select" name="clientId" defaultValue={clientId ?? ""}>
              <option value="">No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!clients.length && <small>No clients yet. <Link href="/clients">Add one</Link> or leave this empty.</small>}
          </label>
          <label className="field wide">
            <span>Health URL <small>(optional)</small></span>
            <input className="input" type="url" name="healthUrl" placeholder="https://client-site.com" />
            <small>We request this address to see whether the project is running. Any answer below HTTP 500 counts as running.</small>
          </label>
          <label className="field">
            <span>Licensed domain <small>(optional)</small></span>
            <input className="input mono" name="allowedDomain" placeholder="client-site.com" />
            <small>Any other domain using the key is flagged.</small>
          </label>
          <label className="field">
            <span>When a second copy appears</span>
            <select className="select" name="policy" defaultValue="warn">
              <option value="warn">Warn me, keep it working</option>
              <option value="block">Block it automatically</option>
            </select>
          </label>
          <label className="field wide">
            <span>Notes <small>(optional)</small></span>
            <textarea className="textarea" name="notes" maxLength={500} />
          </label>
        </div>
        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn primary">Create project</button>
          <Link href="/projects" className="btn">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
