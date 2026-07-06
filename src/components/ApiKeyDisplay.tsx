"use client";

import { useState, useTransition } from "react";
import { regenerateApiKeyAction } from "@/app/actions/environments";

export function ApiKeyDisplay({
  environmentId,
  apiKey,
  canRegenerate,
}: {
  environmentId: string;
  apiKey: string;
  canRegenerate: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <code className="rounded bg-slate-100 px-2 py-1 text-xs">
          {revealed ? apiKey : `${apiKey.slice(0, 6)}${"•".repeat(24)}`}
        </code>
        <button className="text-xs text-brand-600 hover:underline" onClick={() => setRevealed((r) => !r)}>
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button
          className="text-xs text-brand-600 hover:underline"
          onClick={async () => {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {canRegenerate && (
          <button
            className="text-xs text-red-600 hover:underline"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  "Regenerate this API key? The old key stops working immediately — any consuming app using it will fail flag evaluations until updated."
                )
              ) {
                return;
              }
              setError(null);
              startTransition(async () => {
                const result = await regenerateApiKeyAction(environmentId);
                if (!result.ok) setError(result.error ?? "Failed to regenerate");
                else setRevealed(true);
              });
            }}
          >
            {pending ? "Regenerating…" : "Regenerate"}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
