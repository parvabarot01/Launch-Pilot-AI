"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  dotClassName: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Ship",
    dotClassName: "bg-chrome-ship",
    items: [
      { href: "/dashboard/flags", label: "Flags" },
      { href: "/dashboard/experiments", label: "Experiments" },
    ],
  },
  {
    label: "Oversee",
    dotClassName: "bg-chrome-oversee",
    items: [
      { href: "/dashboard/executive", label: "Executive" },
      { href: "/dashboard/governance", label: "Governance" },
      { href: "/dashboard/audit-log", label: "Audit log" },
    ],
  },
];

function NavLink({ item, active, pendingCount }: { item: NavItem; active: boolean; pendingCount?: number }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center justify-between rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active ? "bg-brand-wash text-brand" : "text-slate hover:bg-wash hover:text-ink"
      }`}
    >
      {active && <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-brand" />}
      <span>{item.label}</span>
      {typeof pendingCount === "number" && pendingCount > 0 && (
        <span className="font-mono text-xs font-medium text-risk-watch">{pendingCount}</span>
      )}
    </Link>
  );
}

export function DashboardNav({ pendingApprovalCount }: { pendingApprovalCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5" aria-label="Primary">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <div className="flex items-center gap-2 px-3 text-eyebrow uppercase text-mute">
            <span className={`h-1.5 w-1.5 rounded-full ${group.dotClassName}`} />
            {group.label}
          </div>
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={pathname?.startsWith(item.href) ?? false}
              pendingCount={item.href === "/dashboard/governance" ? pendingApprovalCount : undefined}
            />
          ))}
        </div>
      ))}
      <div className="mt-2 border-t border-rule pt-3">
        <NavLink item={{ href: "/dashboard/settings", label: "Settings" }} active={pathname?.startsWith("/dashboard/settings") ?? false} />
      </div>
    </nav>
  );
}

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/flags", label: "Flags" },
  { href: "/dashboard/experiments", label: "Experiments" },
  { href: "/dashboard/executive", label: "Executive" },
  { href: "/dashboard/governance", label: "Governance" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-rule bg-surface md:hidden"
      aria-label="Primary"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = pathname?.startsWith(item.href) ?? false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 py-2 text-center text-xs font-medium ${active ? "text-brand" : "text-slate"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
