import { mkdirSync } from "node:fs";
import { createClient, type Client, type InValue } from "@libsql/client";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'delivered', health_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active',
    policy TEXT NOT NULL DEFAULT 'warn', allowed_domain TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY, license_id TEXT NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
    host TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'allowed', version TEXT NOT NULL DEFAULT '',
    first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, last_ip TEXT NOT NULL DEFAULT '',
    pings INTEGER NOT NULL DEFAULT 1, UNIQUE (license_id, host))`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    instance_id TEXT, type TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL, resolved INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS health_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    checked_at INTEGER NOT NULL, ok INTEGER NOT NULL, status_code INTEGER, latency_ms INTEGER, error TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_health_project ON health_checks (project_id, checked_at DESC)`,
  `CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL,
    created_at INTEGER NOT NULL, last_used_at INTEGER, revoked_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, at INTEGER NOT NULL)`,
];

let ready: Promise<Client> | undefined;

function open(): Client {
  const url = process.env.DATABASE_URL || "file:data/local.db";
  if (url.startsWith("file:")) mkdirSync("data", { recursive: true });
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
}

/** Opens the database once and makes sure the tables exist. */
export function db(): Promise<Client> {
  ready ??= (async () => {
    const client = open();
    await client.execute("PRAGMA foreign_keys = ON");
    await client.batch(SCHEMA, "write");
    return client;
  })();
  return ready;
}

export type Row = Record<string, InValue | undefined>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const res = await c.execute({ sql, args });
  return res.rows.map((r) => ({ ...r }) as unknown as T);
}

export async function one<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: InValue[] = []) {
  const c = await db();
  return c.execute({ sql, args });
}
