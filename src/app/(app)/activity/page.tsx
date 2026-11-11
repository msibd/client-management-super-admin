import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/client-bits";
import { EventItem } from "@/components/events";
import { requireSession } from "@/lib/auth";
import { listEvents } from "@/lib/queries";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireSession();
  const { show } = await searchParams;
  const openOnly = show === "open";
  const events = await listEvents({ openOnly, limit: 100 });
  return (
    <div className="stack">
      <AutoRefresh />
      <div className="page-head">
        <div>
          <h1>Activity</h1>
          <p>Check-ins, second-copy detections, outages and the actions you took.</p>
        </div>
        <div className="actions" role="group" aria-label="Filter">
          <Link href="/activity" className={`btn ${openOnly ? "" : "primary"}`}>Everything</Link>
          <Link href="/activity?show=open" className={`btn ${openOnly ? "primary" : ""}`}>Needs action</Link>
        </div>
      </div>
      <section className="card">
        {events.length ? (
          <ul className="attention">{events.map((e) => <EventItem key={e.id} e={e} />)}</ul>
        ) : (
          <div className="empty">
            <strong>{openOnly ? "Nothing needs action" : "No activity yet"}</strong>
            {openOnly ? "Duplicate copies and outages will show up here." : "Events appear once a project checks in or goes down."}
          </div>
        )}
      </section>
    </div>
  );
}
