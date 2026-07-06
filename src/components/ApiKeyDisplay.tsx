"use client";

import { useState } from "react";

export function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
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
    </div>
  );
}
