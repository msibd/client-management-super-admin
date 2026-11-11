import { bad, json, requireApiToken } from "@/lib/api-auth";
import { removeInstance, setInstanceStatus } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH { "status": "blocked" | "allowed" } blocks or approves one running copy. */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  const b = (await request.json().catch(() => ({}))) as { status?: string };
  if (b.status !== "blocked" && b.status !== "allowed") return bad('status must be "blocked" or "allowed"');
  await setInstanceStatus(id, b.status);
  return json({ ok: true });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  await removeInstance(id);
  return json({ deleted: true });
}
