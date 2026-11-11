import { bad, json, maskKey, requireApiToken } from "@/lib/api-auth";
import { checkProject } from "@/lib/health";
import { getLicenseByProject, getProject, rotateKey, updateLicense } from "@/lib/queries";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST { "action": "health-check" | "suspend" | "reactivate" | "rotate-key" | "set-policy" | "set-domain",
 *        "policy"?: "warn" | "block", "domain"?: "example.com" }
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireApiToken(request);
  if (denied) return denied;
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return bad("Project not found", 404);
  const b = (await request.json().catch(() => ({}))) as { action?: string; policy?: string; domain?: string };

  switch (b.action) {
    case "health-check": {
      if (!project.health_url) return bad("This project has no health URL.");
      return json({ result: await checkProject(project) });
    }
    case "suspend":
      await updateLicense(id, { status: "suspended" });
      break;
    case "reactivate":
      await updateLicense(id, { status: "active" });
      break;
    case "rotate-key":
      await rotateKey(id);
      break;
    case "set-policy":
      if (b.policy !== "warn" && b.policy !== "block") return bad('policy must be "warn" or "block"');
      await updateLicense(id, { policy: b.policy });
      break;
    case "set-domain":
      await updateLicense(id, { allowed_domain: b.domain ?? "" });
      break;
    default:
      return bad("Unknown action");
  }
  const license = await getLicenseByProject(id);
  return json({ license: license && { ...license, license_key: b.action === "rotate-key" ? license.license_key : maskKey(license.license_key) } });
}
