"use client";

import { useTransition } from "react";
import { changeExperimentStatusAction, simulateTrafficAction } from "@/app/actions/experiments";
import type { ExperimentStatus } from "@/lib/types";

export function ExperimentControls({
  experimentId,
  status,
}: {
  experimentId: string;
  status: ExperimentStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && (
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() => startTransition(async () => { await changeExperimentStatusAction(experimentId, "running"); })}
        >
          Start experiment
        </button>
      )}
      {status === "running" && (
        <button
          className="btn-secondary"
          disabled={pending}
          onClick={() => startTransition(async () => { await changeExperimentStatusAction(experimentId, "completed"); })}
        >
          Mark completed
        </button>
      )}
      {status !== "archived" && (
        <button
          className="btn-secondary"
          disabled={pending}
          onClick={() => startTransition(async () => { await changeExperimentStatusAction(experimentId, "archived"); })}
        >
          Archive
        </button>
      )}
      <button
        className="btn-secondary"
        disabled={pending}
        onClick={() => startTransition(async () => { await simulateTrafficAction(experimentId, 500); })}
        title="Generates simulated exposures/conversions so you can see the stats engine work without wiring up real traffic yet"
      >
        Simulate 500 exposures/variant
      </button>
    </div>
  );
}
