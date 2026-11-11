import { bad, json, requireApiToken } from "@/lib/api-auth";
import { deleteClient, getClient, listProjects, updateClient } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  const client = await getClient(id);
  if (!client) return bad("Client not found", 404);
  return json({ client, projects: await listProjects(id) });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  const current = await getClient(id);
  if (!current) return bad("Client not found", 404);
  const b = (await request.json().catch(() => ({}))) as { name?: string; contact?: string; notes?: string };
  await updateClient(id, { name: b.name ?? current.name, contact: b.contact ?? current.contact, notes: b.notes ?? current.notes });
  return json({ client: await getClient(id) });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  if (!(await getClient(id))) return bad("Client not found", 404);
  await deleteClient(id);
  return json({ deleted: true });
}
