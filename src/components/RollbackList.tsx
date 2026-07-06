"use client";

import { useState, useTransition } from "react";
import { rollbackFlagAction } from "@/app/actions/flags";
import type { FlagRollbackSnapshot } from "@/lib/types";

export function RollbackList({ snapshots }: { snapshots: FlagRollbackSnapshot[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (snapshots.length === 0) {
    return <p className="text-sm text-slate-400">No prior states recorded yet for this environment.</p>;
  }

  return (
    <div className="space-y-2">
      {snapshots
        .slice()
        .reverse()
        .map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
            <div>
              <span className="font-medium text-slate-700">
                {s.state.enabled ? "Enabled" : "Disabled"} · {s.state.rolloutPercentage}%
                {s.state.killSwitch ? " · kill switch" : ""}
              </span>
              <span className="ml-2 text-xs text-slate-400">{new Date(s.createdAt).toLocaleString()}</span>
            </div>
            <button
              className="btn-secondary text-xs"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await rollbackFlagAction(s.id);
                  if (!result.ok) setError(result.error ?? "Rollback failed");
                })
              }
            >
              Roll back to this
            </button>
          </div>
        ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
