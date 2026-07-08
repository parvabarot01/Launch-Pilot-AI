"use client";

import { useState, useTransition } from "react";
import { decideApprovalAction } from "@/app/actions/governance";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          className="btn-primary text-xs"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await decideApprovalAction(approvalId, "approved");
              if (!result.ok) setError(result.error ?? "Failed");
            })
          }
        >
          Approve
        </button>
        <button
          className="btn-danger text-xs"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await decideApprovalAction(approvalId, "rejected");
              if (!result.ok) setError(result.error ?? "Failed");
            })
          }
        >
          Reject
        </button>
      </div>
      {error && <span className="text-xs text-risk-halt">{error}</span>}
    </div>
  );
}
