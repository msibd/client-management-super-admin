import { all, one, run } from "./db";
import { isLocalHost, newLicenseKey, normalizeHost, type Verdict } from "./license";

/* ---------- Types ---------- */
export type Client = { id: string; name: string; contact: string; notes: string; created_at: number };
export type Project = {
  id: string; client_id: string | null; name: string; kind: string; health_url: string; notes: string; created_at: number;
};
export type License = {
  id: string; project_id: string; license_key: string; status: "active" | "suspended";
  policy: "warn" | "block"; allowed_domain: string; created_at: number;
};
export type Instance = {
  id: string; license_id: string; host: string; status: "allowed" | "flagged" | "blocked"; version: string;
  first_seen: number; last_seen: number; last_ip: string; pings: number;
};
export type EventRow = {
  id: string; project_id: string | null; instance_id: string | null; type: string;
  severity: "info" | "warning" | "critical"; message: string; resolved: number; created_at: number;
  project_name?: string | null;
};
export type Health = { checked_at: number; ok: number; status_code: number | null; latency_ms: number | null; error: string | null };

export type ProjectSummary = Project & {
  client_name: string | null;
  license_status: License["status"] | null;
  instance_count: number;
  flagged_count: number;
  last_seen: number | null;
  h_ok: number | null;
  h_at: number | null;
  h_status: number | null;
  h_latency: number | null;
  h_error: string | null;
};

const now = () => Date.now();
const id = () => crypto.randomUUID();

/* ---------- Clients ---------- */
export const listClients = () =>
  all<Client & { project_count: number }>(
    `SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) AS project_count
     FROM clients c ORDER BY c.created_at DESC`,
  );
export const getClient = (cid: string) => one<Client>("SELECT * FROM clients WHERE id = ?", [cid]);

export async function createClient(d: { name: string; contact?: string; notes?: string }) {
  const cid = id();
  await run("INSERT INTO clients (id, name, contact, notes, created_at) VALUES (?, ?, ?, ?, ?)", [
    cid, d.name.trim(), d.contact?.trim() ?? "", d.notes?.trim() ?? "", now(),
  ]);
  return cid;
}
export const updateClient = (cid: string, d: { name: string; contact?: string; notes?: string }) =>
  run("UPDATE clients SET name = ?, contact = ?, notes = ? WHERE id = ?", [d.name.trim(), d.contact?.trim() ?? "", d.notes?.trim() ?? "", cid]);
export const deleteClient = (cid: string) => run("DELETE FROM clients WHERE id = ?", [cid]);

/* ---------- Projects ---------- */
const SUMMARY_SQL = `
  SELECT p.*, c.name AS client_name, l.status AS license_status,
    (SELECT COUNT(*) FROM instances i WHERE i.license_id = l.id AND i.status != 'blocked') AS instance_count,
    (SELECT COUNT(*) FROM instances i WHERE i.license_id = l.id AND i.status = 'flagged') AS flagged_count,
    (SELECT MAX(i.last_seen) FROM instances i WHERE i.license_id = l.id) AS last_seen,
    (SELECT h.ok FROM health_checks h WHERE h.project_id = p.id ORDER BY h.checked_at DESC LIMIT 1) AS h_ok,
    (SELECT h.checked_at FROM health_checks h WHERE h.project_id = p.id ORDER BY h.checked_at DESC LIMIT 1) AS h_at,
    (SELECT h.status_code FROM health_checks h WHERE h.project_id = p.id ORDER BY h.checked_at DESC LIMIT 1) AS h_status,
    (SELECT h.latency_ms FROM health_checks h WHERE h.project_id = p.id ORDER BY h.checked_at DESC LIMIT 1) AS h_latency,
    (SELECT h.error FROM health_checks h WHERE h.project_id = p.id ORDER BY h.checked_at DESC LIMIT 1) AS h_error
  FROM projects p
  LEFT JOIN clients c ON c.id = p.client_id
  LEFT JOIN licenses l ON l.project_id = p.id`;

export const listProjects = (clientId?: string) =>
  all<ProjectSummary>(`${SUMMARY_SQL} ${clientId ? "WHERE p.client_id = ?" : ""} ORDER BY p.created_at DESC`, clientId ? [clientId] : []);
export const getProject = (pid: string) => one<ProjectSummary>(`${SUMMARY_SQL} WHERE p.id = ?`, [pid]);

export async function createProject(d: {
  name: string; clientId?: string | null; kind?: string; healthUrl?: string; notes?: string; allowedDomain?: string; policy?: string;
}) {
  const pid = id();
  await run("INSERT INTO projects (id, client_id, name, kind, health_url, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    pid, d.clientId || null, d.name.trim(), d.kind === "own" ? "own" : "delivered", d.healthUrl?.trim() ?? "", d.notes?.trim() ?? "", now(),
  ]);
  await run("INSERT INTO licenses (id, project_id, license_key, policy, allowed_domain, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    id(), pid, newLicenseKey(), d.policy === "block" ? "block" : "warn", d.allowedDomain ? normalizeHost(d.allowedDomain) : "", now(),
  ]);
  return pid;
}
export const updateProject = (pid: string, d: { name: string; clientId?: string | null; kind?: string; healthUrl?: string; notes?: string }) =>
  run("UPDATE projects SET name = ?, client_id = ?, kind = ?, health_url = ?, notes = ? WHERE id = ?", [
    d.name.trim(), d.clientId || null, d.kind === "own" ? "own" : "delivered", d.healthUrl?.trim() ?? "", d.notes?.trim() ?? "", pid,
  ]);
export const deleteProject = (pid: string) => run("DELETE FROM projects WHERE id = ?", [pid]);

export const recentHealth = (pid: string, limit = 40) =>
  all<Health>("SELECT checked_at, ok, status_code, latency_ms, error FROM health_checks WHERE project_id = ? ORDER BY checked_at DESC LIMIT ?", [pid, limit]);

/* ---------- Licence, instances ---------- */
export const getLicenseByProject = (pid: string) => one<License>("SELECT * FROM licenses WHERE project_id = ?", [pid]);
export const listInstances = (licenseId: string) =>
  all<Instance>("SELECT * FROM instances WHERE license_id = ? ORDER BY CASE status WHEN 'flagged' THEN 0 WHEN 'allowed' THEN 1 ELSE 2 END, last_seen DESC", [licenseId]);

export async function updateLicense(pid: string, d: Partial<Pick<License, "status" | "policy" | "allowed_domain">>) {
  const lic = await getLicenseByProject(pid);
  if (!lic) return;
  await run("UPDATE licenses SET status = ?, policy = ?, allowed_domain = ? WHERE id = ?", [
    d.status ?? lic.status, d.policy ?? lic.policy, d.allowed_domain !== undefined ? normalizeHost(d.allowed_domain) : lic.allowed_domain, lic.id,
  ]);
  if (d.status && d.status !== lic.status) await logEvent(pid, null, d.status === "suspended" ? "suspended" : "reactivated", "info",
    d.status === "suspended" ? "Licence suspended. All copies stop working at their next check." : "Licence reactivated.");
}

/** A new key makes every deployed copy invalid at its next check. Instances are cleared. */
export async function rotateKey(pid: string) {
  const lic = await getLicenseByProject(pid);
  if (!lic) return;
  await run("UPDATE licenses SET license_key = ? WHERE id = ?", [newLicenseKey(), lic.id]);
  await run("DELETE FROM instances WHERE license_id = ?", [lic.id]);
  await run("UPDATE events SET resolved = 1 WHERE project_id = ? AND type = 'duplicate'", [pid]);
  await logEvent(pid, null, "key_rotated", "info", "Licence key replaced. Copies using the old key are now rejected.");
}

export async function setInstanceStatus(instanceId: string, status: Instance["status"]) {
  const inst = await one<Instance & { project_id: string }>(
    "SELECT i.*, l.project_id FROM instances i JOIN licenses l ON l.id = i.license_id WHERE i.id = ?", [instanceId]);
  if (!inst) return;
  await run("UPDATE instances SET status = ? WHERE id = ?", [status, instanceId]);
  await run("UPDATE events SET resolved = 1 WHERE instance_id = ? AND type = 'duplicate'", [instanceId]);
  await logEvent(inst.project_id, instanceId, status === "blocked" ? "blocked" : "allowed", "info",
    status === "blocked" ? `${inst.host} was blocked. It stops working at its next check.` : `${inst.host} was approved.`);
}
export async function removeInstance(instanceId: string) {
  await run("DELETE FROM events WHERE instance_id = ?", [instanceId]);
  await run("DELETE FROM instances WHERE id = ?", [instanceId]);
}

/* ---------- Events ---------- */
export async function logEvent(projectId: string | null, instanceId: string | null, type: string, severity: EventRow["severity"], message: string) {
  await run("INSERT INTO events (id, project_id, instance_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    id(), projectId, instanceId, type, severity, message, now(),
  ]);
}
export const listEvents = (opts: { projectId?: string; openOnly?: boolean; limit?: number } = {}) =>
  all<EventRow>(
    `SELECT e.*, p.name AS project_name FROM events e LEFT JOIN projects p ON p.id = e.project_id
     WHERE 1 = 1 ${opts.projectId ? "AND e.project_id = ?" : ""} ${opts.openOnly ? "AND e.resolved = 0 AND e.severity != 'info'" : ""}
     ORDER BY e.created_at DESC LIMIT ?`,
    [...(opts.projectId ? [opts.projectId] : []), opts.limit ?? 50],
  );
export const resolveEvent = (eid: string) => run("UPDATE events SET resolved = 1 WHERE id = ?", [eid]);

/* ---------- The check-in a delivered project makes ---------- */
export async function verifyCheckIn(input: { key: string; host: string; version?: string; ip?: string }): Promise<{
  licenseId: string; host: string; verdict: Verdict;
} | null> {
  const lic = await one<License>("SELECT * FROM licenses WHERE license_key = ?", [input.key]);
  if (!lic) return null;
  const host = normalizeHost(input.host);
  if (lic.status === "suspended") return { licenseId: lic.id, host, verdict: { valid: false, reason: "licence_suspended" } };
  if (!host || isLocalHost(host)) return { licenseId: lic.id, host, verdict: { valid: true } };

  const t = now();
  const existing = await one<Instance>("SELECT * FROM instances WHERE license_id = ? AND host = ?", [lic.id, host]);
  if (existing) {
    await run("UPDATE instances SET last_seen = ?, last_ip = ?, version = ?, pings = pings + 1 WHERE id = ?", [t, input.ip ?? "", input.version ?? existing.version, existing.id]);
    if (existing.status === "blocked") return { licenseId: lic.id, host, verdict: { valid: false, reason: "instance_blocked" } };
    return { licenseId: lic.id, host, verdict: existing.status === "flagged" ? { valid: true, warning: "duplicate_use_under_review" } : { valid: true } };
  }

  // First time this host checks in.
  const others = await all<Instance>("SELECT * FROM instances WHERE license_id = ? AND status != 'blocked'", [lic.id]);
  const wrongDomain = lic.allowed_domain !== "" && host !== lic.allowed_domain;
  const isDuplicate = others.length > 0 || wrongDomain;
  const status: Instance["status"] = !isDuplicate ? "allowed" : lic.policy === "block" ? "blocked" : "flagged";
  const iid = id();
  await run("INSERT INTO instances (id, license_id, host, status, version, first_seen, last_seen, last_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    iid, lic.id, host, status, input.version ?? "", t, t, input.ip ?? "",
  ]);
  if (!isDuplicate) await logEvent(lic.project_id, iid, "activated", "info", `First copy came online on ${host}.`);
  else {
    const where = wrongDomain ? `${host} (licensed for ${lic.allowed_domain})` : `${host} (already running on ${others.map((o) => o.host).join(", ")})`;
    await logEvent(lic.project_id, iid, "duplicate", "warning", `Possible second copy: ${where}.${status === "blocked" ? " Blocked automatically." : " It still works until you block it."}`);
  }
  if (status === "blocked") return { licenseId: lic.id, host, verdict: { valid: false, reason: "instance_blocked" } };
  return { licenseId: lic.id, host, verdict: status === "flagged" ? { valid: true, warning: "duplicate_use_under_review" } : { valid: true } };
}

/* ---------- API tokens ---------- */
export type ApiToken = { id: string; name: string; prefix: string; created_at: number; last_used_at: number | null; revoked_at: number | null };
export const listTokens = () => all<ApiToken>("SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_tokens ORDER BY created_at DESC");
export async function createTokenRow(name: string, hash: string, prefix: string) {
  await run("INSERT INTO api_tokens (id, name, token_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?)", [id(), name.trim(), hash, prefix, now()]);
}
export const revokeToken = (tid: string) => run("UPDATE api_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL", [now(), tid]);
export async function findTokenByHash(hash: string) {
  const row = await one<ApiToken>("SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_tokens WHERE token_hash = ?", [hash]);
  if (row && !row.revoked_at) await run("UPDATE api_tokens SET last_used_at = ? WHERE id = ?", [now(), row.id]);
  return row && !row.revoked_at ? row : undefined;
}

/* ---------- Overview ---------- */
export async function overviewCounts() {
  const r = await one<{ projects: number; up: number; down: number; unchecked: number; open_alerts: number }>(
    `SELECT
       (SELECT COUNT(*) FROM projects) AS projects,
       (SELECT COUNT(*) FROM (${SUMMARY_SQL}) s WHERE s.h_ok = 1) AS up,
       (SELECT COUNT(*) FROM (${SUMMARY_SQL}) s WHERE s.h_ok = 0) AS down,
       (SELECT COUNT(*) FROM (${SUMMARY_SQL}) s WHERE s.h_ok IS NULL) AS unchecked,
       (SELECT COUNT(*) FROM events WHERE resolved = 0 AND severity != 'info') AS open_alerts`,
  );
  return { projects: Number(r?.projects ?? 0), up: Number(r?.up ?? 0), down: Number(r?.down ?? 0), unchecked: Number(r?.unchecked ?? 0), openAlerts: Number(r?.open_alerts ?? 0) };
}
