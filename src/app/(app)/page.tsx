import Link from "next/link";
import { checkAllAction } from "@/app/actions";
import { AutoRefresh } from "@/components/client-bits";
import { EventItem } from "@/components/events";
import { Icon } from "@/components/icons";
import { ProjectTable } from "@/components/project-table";
import { requireSession } from "@/lib/auth";
import { listEvents, listProjects, overviewCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  await requireSession();
  const [counts, attention, projects] = await Promise.all([
    overviewCounts(),
    listEvents({ openOnly: true, limit: 20 }),
    listProjects(),
  ]);

  const summary =
    counts.projects === 0
      ? "No projects yet."
      : [
          `${counts.projects} ${counts.projects === 1 ? "project" : "projects"}`,
          counts.up ? `${counts.up} running` : null,
          counts.down ? `${counts.down} down` : null,
          counts.unchecked ? `${counts.unchecked} not checked` : null,
        ].filter(Boolean).join(" · ");

  return (
    <div className="stack">
      <AutoRefresh />
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>{summary}</p>
        </div>
        <div className="actions">
          <form action={checkAllAction}>
            <button className="btn"><Icon name="refresh" sm />Check all now</button>
          </form>
          <Link href="/projects/new" className="btn primary"><Icon name="plus" sm />New project</Link>
        </div>
      </div>

      <section className="card" aria-labelledby="attn">
        <div className="card-head">
          <h2 id="attn">Needs your attention</h2>
          <p>Possible second copies and projects that stopped responding.</p>
        </div>
        {attention.length ? (
          <ul className="attention">{attention.map((e) => <EventItem key={e.id} e={e} />)}</ul>
        ) : (
          <div className="empty">
            <strong>Nothing needs attention</strong>
            {counts.projects ? "Every checked project is up and no second copy has been detected." : "Add a project to start monitoring it."}
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="proj">
        <div className="card-head">
          <h2 id="proj">Projects</h2>
          <Link href="/projects" className="muted">View all</Link>
        </div>
        <ProjectTable
          projects={projects.slice(0, 8)}
          empty={<><strong>No projects yet</strong>Create one to get its licence key and start health checks.</>}
        />
      </section>
    </div>
  );
}
