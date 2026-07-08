"use client";

import { useState, useTransition } from "react";
import { regenerateApiKeyAction } from "@/app/actions/environments";

/**
 * `apiKey` must already be access-controlled by the caller — pass `null`
 * (never the real secret) when the viewer isn't authorized to see it.
 * Reveal/copy are only rendered when a real key was actually provided, so
 * there's nothing in the client bundle to leak via devtools for a viewer
 * who was correctly given `null`.
 */
export function ApiKeyDisplay({
  environmentId,
  apiKey,
  lastFour,
  canRegenerate,
}: {
  environmentId: string;
  apiKey: string | null;
  lastFour: string;
  canRegenerate: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (apiKey === null) {
    return (
      <div className="flex items-center gap-2">
        <code className="rounded bg-wash px-2 py-1 font-mono text-xs">{"•".repeat(26)}{lastFour}</code>
        <span className="text-xs text-mute">Ask an admin to view or rotate this key</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <code className="rounded bg-wash px-2 py-1 font-mono text-xs">
          {revealed ? apiKey : `${apiKey.slice(0, 6)}${"•".repeat(24)}`}
        </code>
        <button className="text-xs text-brand hover:underline" onClick={() => setRevealed((r) => !r)}>
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button
          className="text-xs text-brand hover:underline"
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
            className="text-xs text-risk-halt hover:underline"
            disabled={pending}
            aria-busy={pending}
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
      {error && <span className="text-xs text-risk-halt">{error}</span>}
    </div>
  );
}
