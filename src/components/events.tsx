import Link from "next/link";
import { checkProjectAction, instanceOpAction, resolveEventAction } from "@/app/actions";
import { ago } from "@/lib/format";
import type { EventRow } from "@/lib/queries";
import { ConfirmButton } from "./client-bits";
import { Icon } from "./icons";

const ICON: Record<string, string> = { duplicate: "copy", down: "alert", recovered: "check", activated: "check", blocked: "shield", allowed: "check" };

export function EventItem({ e, showActions = true }: { e: EventRow; showActions?: boolean }) {
  const open = e.resolved === 0 && e.severity !== "info";
  return (
    <li>
      <span className={`sev ${e.severity}`}><Icon name={ICON[e.type] ?? "activity"} sm /></span>
      <div>
        <strong>
          {e.project_id ? <Link href={`/projects/${e.project_id}`}>{e.project_name ?? "Project"}</Link> : "System"}
          {e.resolved === 1 && e.severity !== "info" && <span className="pill" style={{ marginLeft: 8 }}>Handled</span>}
        </strong>
        <p>{e.message} <span title={new Date(e.created_at).toISOString()}>· {ago(e.created_at)}</span></p>
      </div>
      {showActions && open && (
        <div className="row-actions">
          {e.type === "duplicate" && e.instance_id && (
            <>
              <form action={instanceOpAction.bind(null, e.instance_id, "block")}>
                <ConfirmButton className="btn sm danger" message="Block this copy? It stops working at its next check.">Block this copy</ConfirmButton>
              </form>
              <form action={instanceOpAction.bind(null, e.instance_id, "allow")}>
                <button className="btn sm">Approve</button>
              </form>
            </>
          )}
          {e.type === "down" && e.project_id && (
            <form action={checkProjectAction.bind(null, e.project_id)}>
              <button className="btn sm"><Icon name="refresh" sm />Check again</button>
            </form>
          )}
          {e.type !== "duplicate" && (
            <form action={resolveEventAction.bind(null, e.id)}>
              <button className="btn sm">Dismiss</button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}
