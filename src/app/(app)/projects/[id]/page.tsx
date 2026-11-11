import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  checkProjectAction, deleteProjectAction, instanceOpAction, licenseOpAction, licenseSettingsAction, updateProjectAction,
} from "@/app/actions";
import { AutoRefresh, CodeBlock, ConfirmButton, CopyField } from "@/components/client-bits";
import { EventItem } from "@/components/events";
import { Icon } from "@/components/icons";
import { HealthStatus } from "@/components/project-table";
import { requireSession } from "@/lib/auth";
import { ago, when } from "@/lib/format";
import { publicKeyPem } from "@/lib/license";
import {
  getLicenseByProject, getProject, listClients, listEvents, listInstances, recentHealth, type Instance,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Project" };
export const dynamic = "force-dynamic";

const INSTANCE_LABEL: Record<Instance["status"], { text: string; cls: string }> = {
  allowed: { text: "Approved", cls: "ok" },
  flagged: { text: "Under review", cls: "warn" },
  blocked: { text: "Blocked", cls: "bad" },
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [license, health, events, clients] = await Promise.all([
    getLicenseByProject(id), recentHealth(id, 40), listEvents({ projectId: id, limit: 15 }), listClients(),
  ]);
  const instances = license ? await listInstances(license.id) : [];
  const h = await headers();
  const baseUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const ups = health.filter((c) => c.ok).length;
  const delivered = project.kind !== "own";

  const envBlock = license
    ? `LICENSE_KEY=${license.license_key}\nLICENSE_SERVER_URL=${baseUrl}\nLICENSE_PUBLIC_KEY_B64=${Buffer.from(publicKeyPem()).toString("base64")}`
    : "";

  return (
    <div className="stack">
      <AutoRefresh seconds={30} />
      <div className="page-head">
        <div>
          <p style={{ marginBottom: 6 }}><Link href="/projects" className="muted">← Projects</Link></p>
          <h1>{project.name}</h1>
          <p>
            {delivered ? (project.client_name ? <>For <Link href={`/clients/${project.client_id}`}>{project.client_name}</Link></> : "No client assigned") : "My own project"}
            {project.health_url && <> · <span className="mono">{project.health_url.replace(/^https?:\/\//, "")}</span></>}
          </p>
        </div>
        <div className="actions">
          {project.health_url && (
            <form action={checkProjectAction.bind(null, id)}>
              <button className="btn"><Icon name="refresh" sm />Check now</button>
            </form>
          )}
        </div>
      </div>

      <section className="card" aria-labelledby="health">
        <div className="card-head">
          <h2 id="health">Is it running?</h2>
          <HealthStatus p={project} />
        </div>
        <div className="card-body" style={{ display: "grid", gap: 12 }}>
          {health.length ? (
            <>
              <div className="strip" role="img" aria-label={`Last ${health.length} checks: ${ups} up, ${health.length - ups} down`}>
                {[...health].reverse().map((c, i) => (
                  <i key={i} className={c.ok ? "" : "bad"} title={`${when(c.checked_at)} · ${c.ok ? `HTTP ${c.status_code}` : (c.error ?? `HTTP ${c.status_code}`)}`} />
                ))}
              </div>
              <p className="muted">
                {ups} of the last {health.length} checks passed. Last check {ago(health[0].checked_at)}
                {project.h_error ? ` · ${project.h_error}` : ""}.
              </p>
            </>
          ) : (
            <p className="muted">
              {project.health_url ? "No check has run yet. Use “Check now”." : "Add a health URL under Edit project to monitor whether this project is up."}
            </p>
          )}
        </div>
      </section>

      {license && delivered && (
        <>
          <section className="card" aria-labelledby="lic">
            <div className="card-head">
              <h2 id="lic">Licence</h2>
              <span className={`pill ${license.status === "active" ? "ok" : "bad"}`}>{license.status === "active" ? "Active" : "Suspended"}</span>
            </div>
            <div className="card-body" style={{ display: "grid", gap: 18 }}>
              <div className="field">
                <span>Licence key</span>
                <CopyField value={license.license_key} label="Licence key" />
              </div>
              <form action={licenseSettingsAction.bind(null, id)} className="form-grid">
                <label className="field">
                  <span>Licensed domain</span>
                  <input className="input mono" name="allowedDomain" defaultValue={license.allowed_domain} placeholder="Any domain" />
                </label>
                <label className="field">
                  <span>When a second copy appears</span>
                  <select className="select" name="policy" defaultValue={license.policy}>
                    <option value="warn">Warn me, keep it working</option>
                    <option value="block">Block it automatically</option>
                  </select>
                </label>
                <div className="wide"><button className="btn">Save licence settings</button></div>
              </form>
              <div className="actions">
                {license.status === "active" ? (
                  <form action={licenseOpAction.bind(null, id, "suspend")}>
                    <ConfirmButton className="btn danger" message="Suspend this licence? Every copy stops working at its next check.">Suspend licence</ConfirmButton>
                  </form>
                ) : (
                  <form action={licenseOpAction.bind(null, id, "reactivate")}>
                    <button className="btn primary">Reactivate licence</button>
                  </form>
                )}
                <form action={licenseOpAction.bind(null, id, "rotate")}>
                  <ConfirmButton className="btn" message="Create a new key? Copies using the old key are rejected until you update them.">
                    <Icon name="key" sm />Replace key
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </section>

          <section className="card" aria-labelledby="copies">
            <div className="card-head">
              <h2 id="copies">Running copies</h2>
              <p>One copy is normal. More than one means the project was put on a second site.</p>
            </div>
            {instances.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Site</th><th>Status</th><th>First seen</th><th>Last check-in</th><th>Check-ins</th><th /></tr>
                  </thead>
                  <tbody>
                    {instances.map((i) => (
                      <tr key={i.id}>
                        <td><span className="mono">{i.host}</span>{i.version && <span className="sub">version {i.version}</span>}</td>
                        <td><span className={`pill ${INSTANCE_LABEL[i.status].cls}`}>{INSTANCE_LABEL[i.status].text}</span></td>
                        <td className="muted">{when(i.first_seen)}</td>
                        <td className="muted">{ago(i.last_seen)}</td>
                        <td>{i.pings}</td>
                        <td>
                          <div className="row-actions">
                            {i.status !== "blocked" ? (
                              <form action={instanceOpAction.bind(null, i.id, "block")}>
                                <ConfirmButton className="btn sm danger" message={`Block ${i.host}? It stops working at its next check.`}>Block</ConfirmButton>
                              </form>
                            ) : (
                              <form action={instanceOpAction.bind(null, i.id, "allow")}>
                                <button className="btn sm">Unblock</button>
                              </form>
                            )}
                            {i.status === "flagged" && (
                              <form action={instanceOpAction.bind(null, i.id, "allow")}>
                                <button className="btn sm">Approve</button>
                              </form>
                            )}
                            <form action={instanceOpAction.bind(null, i.id, "remove")}>
                              <ConfirmButton className="btn sm" message={`Forget ${i.host}? It will be treated as new if it checks in again.`}>Remove</ConfirmButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <strong>No copy has checked in yet</strong>
                Add the snippet below to the project, deploy it, and it appears here.
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="connect">
            <div className="card-head">
              <h2 id="connect">Connect the project</h2>
              <p>Add these to the delivered project’s environment, then call the check from <span className="mono">client-sdk/license-check.ts</span>.</p>
            </div>
            <div className="card-body"><CodeBlock code={envBlock} /></div>
          </section>
        </>
      )}

      <section className="card" aria-labelledby="act">
        <div className="card-head"><h2 id="act">Activity</h2></div>
        {events.length ? (
          <ul className="attention">{events.map((e) => <EventItem key={e.id} e={e} />)}</ul>
        ) : (
          <div className="empty">Nothing has happened on this project yet.</div>
        )}
      </section>

      <section className="card">
        <div className="card-body">
          <details>
            <summary><Icon name="chev" sm />Edit project</summary>
            <form action={updateProjectAction.bind(null, id)} className="form-grid" style={{ marginTop: 16 }}>
              <label className="field wide"><span>Project name</span><input className="input" name="name" defaultValue={project.name} required maxLength={80} /></label>
              <label className="field">
                <span>Who is it for?</span>
                <select className="select" name="kind" defaultValue={project.kind}>
                  <option value="delivered">Delivered to a client</option>
                  <option value="own">My own project</option>
                </select>
              </label>
              <label className="field">
                <span>Client</span>
                <select className="select" name="clientId" defaultValue={project.client_id ?? ""}>
                  <option value="">No client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="field wide"><span>Health URL</span><input className="input" type="url" name="healthUrl" defaultValue={project.health_url} placeholder="https://client-site.com" /></label>
              <label className="field wide"><span>Notes</span><textarea className="textarea" name="notes" defaultValue={project.notes} maxLength={500} /></label>
              <div className="wide"><button className="btn primary">Save changes</button></div>
            </form>
            <form action={deleteProjectAction.bind(null, id)} style={{ marginTop: 18 }}>
              <ConfirmButton className="btn danger" message="Delete this project, its licence and all history? This cannot be undone.">Delete project</ConfirmButton>
            </form>
          </details>
        </div>
      </section>
    </div>
  );
}
