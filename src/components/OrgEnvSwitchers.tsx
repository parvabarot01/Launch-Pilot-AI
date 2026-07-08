"use client";

import { switchEnvironmentAction, switchOrgAction } from "@/app/actions/context";

export function OrgSwitcher({
  memberships,
  activeOrgId,
}: {
  memberships: { orgId: string; org: { name: string } }[];
  activeOrgId: string;
}) {
  return (
    <form action={switchOrgAction}>
      <select
        name="orgId"
        defaultValue={activeOrgId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-control border border-rule bg-surface px-2 py-1 text-sm text-ink"
      >
        {memberships.map((m) => (
          <option key={m.orgId} value={m.orgId}>
            {m.org.name}
          </option>
        ))}
      </select>
    </form>
  );
}

export function EnvironmentSwitcher({
  environments,
  activeEnvKey,
}: {
  environments: { id: string; key: string; name: string }[];
  activeEnvKey: string;
}) {
  return (
    <form action={switchEnvironmentAction}>
      <input type="hidden" name="returnTo" value="/dashboard" />
      <select
        name="envKey"
        defaultValue={activeEnvKey}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-control border border-rule bg-surface px-2 py-1 text-sm capitalize text-ink"
      >
        {environments.map((e) => (
          <option key={e.id} value={e.key}>
            {e.name}
          </option>
        ))}
      </select>
    </form>
  );
}
