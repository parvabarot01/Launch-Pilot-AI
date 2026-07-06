import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewerContext } from "@/lib/context";
import { logoutAction } from "@/app/actions/auth";
import { OrgSwitcher, EnvironmentSwitcher } from "@/components/OrgEnvSwitchers";

const NAV = [
  { href: "/dashboard/executive", label: "Executive" },
  { href: "/dashboard/flags", label: "Flags" },
  { href: "/dashboard/experiments", label: "Experiments" },
  { href: "/dashboard/assistant", label: "AI Assistant" },
  { href: "/dashboard/governance", label: "Governance" },
  { href: "/dashboard/audit-log", label: "Audit Log" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = requireViewerContext();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                LP
              </div>
              <span className="font-semibold tracking-tight">LaunchPilot</span>
            </Link>

            {ctx.memberships.length > 1 ? (
              <OrgSwitcher memberships={ctx.memberships} activeOrgId={ctx.org.id} />
            ) : (
              <span className="text-sm text-slate-500">{ctx.org.name}</span>
            )}

            <EnvironmentSwitcher
              environments={ctx.environments.map((e) => ({ id: e.id, key: e.key, name: e.name }))}
              activeEnvKey={ctx.environment.key}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {ctx.user.name} · <span className="capitalize">{ctx.membership.role}</span>
            </span>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary text-xs">
                Log out
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-t-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
