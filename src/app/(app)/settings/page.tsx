import type { Metadata } from "next";
import { headers } from "next/headers";
import { createTokenAction, revokeTokenAction } from "@/app/actions";
import { CodeBlock, ConfirmButton, TokenCreator } from "@/components/client-bits";
import { requireSession } from "@/lib/auth";
import { ago } from "@/lib/format";
import { publicKeyPem } from "@/lib/license";
import { listTokens } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireSession();
  const tokens = await listTokens();
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const pub = Buffer.from(publicKeyPem()).toString("base64");

  const curl = `# List projects
curl ${base}/api/v1/admin/projects \\
  -H "Authorization: Bearer <your token>"

# Create a project (returns its licence key)
curl -X POST ${base}/api/v1/admin/projects \\
  -H "Authorization: Bearer <your token>" -H "Content-Type: application/json" \\
  -d '{"name":"Dental admin","healthUrl":"https://client-site.com","allowedDomain":"client-site.com"}'

# Block one running copy
curl -X PATCH ${base}/api/v1/admin/instances/<instance id> \\
  -H "Authorization: Bearer <your token>" -H "Content-Type: application/json" \\
  -d '{"status":"blocked"}'

# Suspend a licence, replace its key, or check health now
curl -X POST ${base}/api/v1/admin/projects/<project id>/actions \\
  -H "Authorization: Bearer <your token>" -H "Content-Type: application/json" \\
  -d '{"action":"suspend"}'   # suspend | reactivate | rotate-key | health-check`;

  return (
    <div className="stack" style={{ maxWidth: 860 }}>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Signed in as {session.email}.</p>
        </div>
      </div>

      <section className="card" aria-labelledby="tok">
        <div className="card-head">
          <h2 id="tok">API tokens</h2>
          <p>Let scripts or other projects manage this panel over REST.</p>
        </div>
        <div className="card-body" style={{ display: "grid", gap: 18 }}>
          <TokenCreator action={createTokenAction} />
        </div>
        {tokens.length > 0 && (
          <div className="table-wrap" style={{ borderTop: "1px solid var(--line)" }}>
            <table>
              <thead><tr><th>Name</th><th>Token</th><th>Last used</th><th>Status</th><th /></tr></thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td className="mono">{t.prefix}</td>
                    <td className="muted">{t.last_used_at ? ago(t.last_used_at) : "Never"}</td>
                    <td>{t.revoked_at ? <span className="pill bad">Revoked</span> : <span className="pill ok">Active</span>}</td>
                    <td className="r">
                      {!t.revoked_at && (
                        <form action={revokeTokenAction.bind(null, t.id)}>
                          <ConfirmButton className="btn sm danger" message={`Revoke “${t.name}”? Anything using it stops working.`}>Revoke</ConfirmButton>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="api">
        <div className="card-head"><h2 id="api">API reference</h2><p className="mono">{base}/api/v1</p></div>
        <div className="card-body"><CodeBlock code={curl} /></div>
      </section>

      <section className="card" aria-labelledby="pk">
        <div className="card-head">
          <h2 id="pk">Licence public key</h2>
          <p>Put this in every delivered project as LICENSE_PUBLIC_KEY_B64. It can only verify, never sign.</p>
        </div>
        <div className="card-body">{pub ? <CodeBlock code={pub} /> : <p className="form-error">LICENSE_PUBLIC_KEY_B64 is not set. Run npm run setup.</p>}</div>
      </section>
    </div>
  );
}
