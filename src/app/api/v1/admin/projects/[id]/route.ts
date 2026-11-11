import { bad, json, maskKey, requireApiToken } from "@/lib/api-auth";
import { deleteProject, getLicenseByProject, getProject, listEvents, listInstances, recentHealth, updateProject } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

/** Everything about one project: health history, licence, copies in the wild, recent events. */
export async function GET(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return bad("Project not found", 404);
  const license = await getLicenseByProject(id);
  const reveal = new URL(request.url).searchParams.get("reveal") === "1";
  return json({
    project,
    license: license && { ...license, license_key: reveal ? license.license_key : maskKey(license.license_key) },
    instances: license ? await listInstances(license.id) : [],
    health: await recentHealth(id, 20),
    events: await listEvents({ projectId: id, limit: 20 }),
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  const cur = await getProject(id);
  if (!cur) return bad("Project not found", 404);
  const b = (await request.json().catch(() => ({}))) as { name?: string; clientId?: string | null; kind?: string; healthUrl?: string; notes?: string };
  if (b.healthUrl && !/^https?:\/\//i.test(b.healthUrl)) return bad("healthUrl must start with http:// or https://");
  await updateProject(id, {
    name: b.name ?? cur.name,
    clientId: b.clientId === undefined ? cur.client_id : b.clientId,
    kind: b.kind ?? cur.kind,
    healthUrl: b.healthUrl ?? cur.health_url,
    notes: b.notes ?? cur.notes,
  });
  return json({ project: await getProject(id) });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  if (!(await getProject(id))) return bad("Project not found", 404);
  await deleteProject(id);
  return json({ deleted: true });
}
