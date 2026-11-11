export function ago(ts: number | null | undefined): string {
  if (!ts) return "Never";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "Just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export function when(ts: number): string {
  return new Date(ts).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type HealthState = "up" | "down" | "idle";
export const healthState = (ok: number | null | undefined): HealthState => (ok === 1 ? "up" : ok === 0 ? "down" : "idle");
