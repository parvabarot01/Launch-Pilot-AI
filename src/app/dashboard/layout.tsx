import Link from "next/link";
import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext } from "@/lib/context";
import { logoutAction } from "@/app/actions/auth";
import { OrgSwitcher, EnvironmentSwitcher } from "@/components/OrgEnvSwitchers";
import { DashboardNav, MobileTabBar } from "@/components/DashboardNav";
import { ToastProvider } from "@/components/Toast";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { EnvironmentKey } from "@/lib/types";

const ENV_BAND_CLASS: Record<EnvironmentKey, string> = {
  development: "bg-env-dev",
  staging: "bg-env-staging",
  production: "bg-env-prod",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const pendingApprovalCount = db.approvals.filter(
    (a) => a.orgId === ctx.org.id && a.status === "pending"
  ).length;

  const bandClass = ENV_BAND_CLASS[ctx.environment.key];

  return (
    <ToastProvider>
    <div className="min-h-screen bg-wash">
      <div className={`h-[2px] w-full ${bandClass}`} />
      <div className="flex">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-rule bg-wash md:flex">
          <div className={`h-[2px] w-full ${bandClass}`} />
          <div className="flex items-center gap-2 px-5 py-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-control bg-brand text-xs font-bold text-white">
                LP
              </div>
              <span className="font-semibold tracking-tight text-ink">LaunchPilot</span>
            </Link>
          </div>
          <div className="flex flex-1 flex-col justify-between px-3 pb-3">
            <DashboardNav pendingApprovalCount={pendingApprovalCount} />
            <ThemeToggle />
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-rule bg-surface">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-4">
                {ctx.memberships.length > 1 ? (
                  <OrgSwitcher memberships={ctx.memberships} activeOrgId={ctx.org.id} />
                ) : (
                  <span className="text-sm text-slate">{ctx.org.name}</span>
                )}
                <EnvironmentSwitcher
                  environments={ctx.environments.map((e) => ({ id: e.id, key: e.key, name: e.name }))}
                  activeEnvKey={ctx.environment.key}
                />
              </div>

              <div className="flex items-center gap-3">
                <AssistantDrawer />
                <span className="text-sm text-slate">
                  {ctx.user.name} · <span className="capitalize">{ctx.membership.role}</span>
                </span>
                <form action={logoutAction}>
                  <button type="submit" className="btn-secondary text-xs">
                    Log out
                  </button>
                </form>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1180px] flex-1 px-8 py-7 pb-20 md:pb-7">{children}</main>
        </div>
      </div>
      <MobileTabBar />
    </div>
    </ToastProvider>
  );
}
