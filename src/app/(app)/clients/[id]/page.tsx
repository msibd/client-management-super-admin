import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteClientAction, updateClientAction } from "@/app/actions";
import { ConfirmButton } from "@/components/client-bits";
import { Icon } from "@/components/icons";
import { ProjectTable } from "@/components/project-table";
import { requireSession } from "@/lib/auth";
import { getClient, listProjects } from "@/lib/queries";

export const metadata: Metadata = { title: "Client" };
export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const projects = await listProjects(id);
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p style={{ marginBottom: 6 }}><Link href="/clients" className="muted">← Clients</Link></p>
          <h1>{client.name}</h1>
          {client.contact && <p>{client.contact}</p>}
        </div>
        <Link href={`/projects/new?clientId=${id}`} className="btn primary"><Icon name="plus" sm />New project</Link>
      </div>

      <section className="card">
        <div className="card-head"><h2>Projects</h2></div>
        <ProjectTable projects={projects} empty={<><strong>No projects for this client</strong>Create one to give them a licence key.</>} />
      </section>

      <section className="card">
        <div className="card-body">
          <details>
            <summary><Icon name="chev" sm />Edit client</summary>
            <form action={updateClientAction.bind(null, id)} className="form-grid" style={{ marginTop: 16 }}>
              <label className="field"><span>Name</span><input className="input" name="name" defaultValue={client.name} required maxLength={80} /></label>
              <label className="field"><span>Contact</span><input className="input" name="contact" defaultValue={client.contact} maxLength={120} /></label>
              <label className="field wide"><span>Notes</span><textarea className="textarea" name="notes" defaultValue={client.notes} maxLength={500} /></label>
              <div className="wide"><button className="btn primary">Save changes</button></div>
            </form>
            <form action={deleteClientAction.bind(null, id)} style={{ marginTop: 18 }}>
              <ConfirmButton className="btn danger" message="Delete this client? Their projects stay but lose the client link.">Delete client</ConfirmButton>
            </form>
          </details>
        </div>
      </section>
    </div>
  );
}
