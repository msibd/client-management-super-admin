import Link from "next/link";
import { ago, healthState } from "@/lib/format";
import type { ProjectSummary } from "@/lib/queries";

export function HealthStatus({ p }: { p: Pick<ProjectSummary, "health_url" | "h_ok" | "h_status" | "h_latency" | "h_error"> }) {
  if (!p.health_url) return <span className="status idle"><span className="dot" />No health URL</span>;
  const s = healthState(p.h_ok);
  if (s === "idle") return <span className="status idle"><span className="dot" />Not checked yet</span>;
  return (
    <span className={`status ${s}`} title={p.h_error ?? undefined}>
      <span className="dot" />
      {s === "up" ? "Running" : "Down"}
      {s === "up" && p.h_latency != null && <span className="muted" style={{ fontWeight: 400 }}>{p.h_latency} ms</span>}
    </span>
  );
}

export function LicensePill({ p }: { p: Pick<ProjectSummary, "license_status" | "flagged_count" | "instance_count"> }) {
  if (p.license_status === "suspended") return <span className="pill bad">Suspended</span>;
  if (p.flagged_count > 0) return <span className="pill warn">Possible 2nd copy</span>;
  return <span className="pill ok">Active</span>;
}

export function ProjectTable({ projects, empty }: { projects: ProjectSummary[]; empty: React.ReactNode }) {
  if (!projects.length) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Running now</th>
            <th>Licence</th>
            <th>Copies</th>
            <th>Last check-in</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link>
                <span className="sub">{p.kind === "own" ? "My own project" : (p.client_name ?? "No client assigned")}</span>
              </td>
              <td><HealthStatus p={p} /></td>
              <td>{p.kind === "own" ? <span className="muted">Not needed</span> : <LicensePill p={p} />}</td>
              <td>{p.kind === "own" ? <span className="muted">—</span> : p.instance_count}</td>
              <td className="muted">{p.kind === "own" ? "—" : ago(p.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
