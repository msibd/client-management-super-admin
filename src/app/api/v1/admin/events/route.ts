import { json, requireApiToken } from "@/lib/api-auth";
import { listEvents } from "@/lib/queries";

/** GET ?open=1 returns only unresolved warnings and critical events. */
export async function GET(request: Request) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const url = new URL(request.url);
  return json({
    events: await listEvents({
      openOnly: url.searchParams.get("open") === "1",
      projectId: url.searchParams.get("projectId") ?? undefined,
      limit: Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200),
    }),
  });
}
