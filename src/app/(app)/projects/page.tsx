import type { Metadata } from "next";
import Link from "next/link";
import { checkAllAction } from "@/app/actions";
import { AutoRefresh } from "@/components/client-bits";
import { Icon } from "@/components/icons";
import { ProjectTable } from "@/components/project-table";
import { requireSession } from "@/lib/auth";
import { listProjects } from "@/lib/queries";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireSession();
  const projects = await listProjects();
  return (
    <div className="stack">
      <AutoRefresh />
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p>Every project you built, with whether it is running and how many copies are in use.</p>
        </div>
        <div className="actions">
          <form action={checkAllAction}>
            <button className="btn"><Icon name="refresh" sm />Check all now</button>
          </form>
          <Link href="/projects/new" className="btn primary"><Icon name="plus" sm />New project</Link>
        </div>
      </div>
      <div className="card">
        <ProjectTable
          projects={projects}
          empty={<><strong>No projects yet</strong>Create a project to get its licence key and start health checks.</>}
        />
      </div>
    </div>
  );
}
