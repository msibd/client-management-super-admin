import { bad, json, maskKey, requireApiToken } from "@/lib/api-auth";
import { createProject, getLicenseByProject, getProject, listProjects } from "@/lib/queries";

export async function GET(request: Request) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const url = new URL(request.url);
  return json({ projects: await listProjects(url.searchParams.get("clientId") ?? undefined) });
}

/** Creates a project and its licence. The full licence key is returned here, once more via GET ?reveal=1. */
export async function POST(request: Request) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const b = (await request.json().catch(() => null)) as {
    name?: string; clientId?: string; kind?: string; healthUrl?: string; notes?: string; allowedDomain?: string; policy?: string;
  } | null;
  if (!b?.name?.trim()) return bad("name is required");
  if (b.healthUrl && !/^https?:\/\//i.test(b.healthUrl)) return bad("healthUrl must start with http:// or https://");
  const id = await createProject(b as Parameters<typeof createProject>[0]);
  const license = await getLicenseByProject(id);
  return json({ project: await getProject(id), license: license && { ...license, license_key: license.license_key, masked: maskKey(license.license_key) } }, 201);
}
