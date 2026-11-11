import { all, one, run } from "./db";

type Project = { id: string; health_url: string };

export type HealthResult = { ok: boolean; status: number | null; latency: number | null; error: string | null };

export async function probe(url: string): Promise<HealthResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "client-management-health/1.0" },
    });
    // Anything below 500 means the server answered (login pages redirect or return 401/403).
    return { ok: res.status < 500, status: res.status, latency: Date.now() - started, error: null };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "TimeoutError" ? "Timed out after 8s" : e.message) : "Request failed";
    return { ok: false, status: null, latency: null, error: msg };
  }
}

export async function checkProject(p: Project): Promise<HealthResult | null> {
  if (!p.health_url) return null;
  const r = await probe(p.health_url);
  await run(
    "INSERT INTO health_checks (project_id, checked_at, ok, status_code, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?)",
    [p.id, Date.now(), r.ok ? 1 : 0, r.status, r.latency, r.error],
  );
  await run(
    "DELETE FROM health_checks WHERE project_id = ? AND id NOT IN (SELECT id FROM health_checks WHERE project_id = ? ORDER BY checked_at DESC LIMIT 100)",
    [p.id, p.id],
  );
  const prev = await one<{ ok: number }>(
    "SELECT ok FROM health_checks WHERE project_id = ? ORDER BY checked_at DESC LIMIT 1 OFFSET 1",
    [p.id],
  );
  if (prev && Boolean(prev.ok) !== r.ok) {
    const message = r.ok
      ? "Project is reachable again."
      : `Project stopped responding${r.error ? `: ${r.error}` : ` (HTTP ${r.status})`}.`;
    await run(
      "INSERT INTO events (id, project_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), p.id, r.ok ? "recovered" : "down", r.ok ? "info" : "critical", message, Date.now()],
    );
  }
  return r;
}

export async function checkAll() {
  const projects = await all<Project>("SELECT id, health_url FROM projects WHERE health_url != ''");
  await Promise.all(projects.map(checkProject));
  return projects.length;
}
