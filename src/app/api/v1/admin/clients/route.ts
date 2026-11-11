import { bad, json, requireApiToken } from "@/lib/api-auth";
import { createClient, getClient, listClients } from "@/lib/queries";

export async function GET(request: Request) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  return json({ clients: await listClients() });
}

export async function POST(request: Request) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const b = (await request.json().catch(() => null)) as { name?: string; contact?: string; notes?: string } | null;
  if (!b?.name?.trim()) return bad("name is required");
  const id = await createClient({ name: b.name, contact: b.contact, notes: b.notes });
  return json({ client: await getClient(id) }, 201);
}
