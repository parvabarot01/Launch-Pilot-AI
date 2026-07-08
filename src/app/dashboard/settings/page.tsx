import { redirect } from "next/navigation";
import { readDb } from "@/lib/db";
import { requireViewerContext, requireRole } from "@/lib/context";
import { AddMemberForm } from "@/components/AddMemberForm";
import { ApiKeyDisplay } from "@/components/ApiKeyDisplay";

export default async function SettingsPage() {
  const ctx = await requireViewerContext();
  if (!ctx) redirect("/login");

  const db = await readDb();
  const members = db.memberships
    .filter((m) => m.orgId === ctx.org.id)
    .map((m) => ({ ...m, user: db.users.find((u) => u.id === m.userId) }))
    .filter((m) => m.user);

  const canManageMembers = requireRole(ctx, "admin");
  const canRegenerateKeys = requireRole(ctx, "admin");
  // Viewers (read-only stakeholders, e.g. an exec per PERSONAS.md) should
  // never receive the live secret in the page payload at all — not just
  // have the reveal/copy buttons hidden client-side.
  const canViewSecrets = requireRole(ctx, "member");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title text-ink">Settings</h1>
        <p className="text-sm text-slate">{ctx.org.name}</p>
      </div>

      <div className="card">
        <h2 className="text-section-head text-ink">Environments &amp; API keys</h2>
        <p className="mt-1 text-sm text-slate">
          Each environment has its own key. Use it from the client SDK to evaluate flags.
        </p>
        <div className="mt-4 space-y-3">
          {ctx.environments.map((env) => (
            <div key={env.id} className="flex items-center justify-between rounded-control border border-rule px-3 py-2">
              <span className="font-medium capitalize text-slate">{env.name}</span>
              <ApiKeyDisplay
                environmentId={env.id}
                apiKey={canViewSecrets ? env.apiKey : null}
                lastFour={env.apiKey.slice(-4)}
                canRegenerate={canRegenerateKeys}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-control bg-ink p-4 text-xs text-white">
          <pre className="overflow-x-auto font-mono">{`<script src="/sdk/launchpilot.js"></script>
<script>
  const lp = LaunchPilot.init({ apiKey: "<environment API key above>", baseUrl: window.location.origin });
  const isOn = await lp.getFlag("your-flag-key", false, { userId: "u_123" });
</script>`}</pre>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-section-head text-ink">Members</h2>
        </div>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-eyebrow uppercase text-mute">
            <tr>
              <th className="pb-2">Name</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="py-2 text-ink">{m.user!.name}</td>
                <td className="py-2 text-slate">{m.user!.email}</td>
                <td className="py-2 capitalize text-ink">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {canManageMembers && (
          <div className="mt-4 border-t border-rule pt-4">
            <AddMemberForm />
            <p className="mt-2 text-xs text-mute">
              The person must already have a LaunchPilot account (sign up first) — there's no connected
              email service yet to send an invite link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
