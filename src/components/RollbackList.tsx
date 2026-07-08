"use client";

import { useState, useTransition } from "react";
import { rollbackFlagAction } from "@/app/actions/flags";
import { riskSpineClass, type RiskToken } from "@/lib/risk";
import type { FlagRollbackSnapshot } from "@/lib/types";

function snapshotToken(state: FlagRollbackSnapshot["state"]): RiskToken {
  if (state.killSwitch) return "halt";
  if (state.enabled) return "clear";
  return "inert";
}

export function RollbackList({ snapshots }: { snapshots: FlagRollbackSnapshot[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (snapshots.length === 0) {
    return <p className="text-sm text-mute">No prior states recorded yet for this environment.</p>;
  }

  return (
    <div className="space-y-2">
      {snapshots
        .slice()
        .reverse()
        .map((s) => (
          <div
            key={s.id}
            className={`flex items-center justify-between rounded-control border border-rule px-3 py-2 text-sm ${riskSpineClass(snapshotToken(s.state))}`}
          >
            <div>
              <span className="font-medium text-slate">
                {s.state.enabled ? "Enabled" : "Disabled"} · {s.state.rolloutPercentage}%
                {s.state.killSwitch ? " · kill switch" : ""}
              </span>
              <span className="ml-2 text-xs text-mute">{new Date(s.createdAt).toLocaleString("en-US")}</span>
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
      {error && <p className={`text-sm text-risk-halt`}>{error}</p>}
    </div>
  );
}
