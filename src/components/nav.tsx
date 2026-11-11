"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

const ITEMS = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/clients", label: "Clients", icon: "clients" },
  { href: "/activity", label: "Activity", icon: "activity" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Nav({ openAlerts }: { openAlerts: number }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map((i) => {
        const active = i.href === "/" ? path === "/" : path === i.href || path.startsWith(`${i.href}/`);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            <Icon name={i.icon} />
            {i.label}
            {i.href === "/activity" && openAlerts > 0 && (
              <span className="badge-count" aria-label={`${openAlerts} open alerts`}>{openAlerts}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
