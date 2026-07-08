"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { askAssistantAction } from "@/app/actions/assistant";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "groq" | "heuristic";
}

const DEFAULT_SUGGESTIONS = [
  "Which experiment should we prioritize next?",
  "Why did any experiments fail to show an effect?",
  "Should we increase rollout on any flags?",
];

const ROUTE_SUGGESTIONS: { match: (path: string) => boolean; suggestions: string[] }[] = [
  {
    match: (p) => /^\/dashboard\/flags\/[^/]+$/.test(p),
    suggestions: [
      "Why is this flag scored the way it is?",
      "Who approved the last rollout on this flag?",
      "Draft a rollback note for this flag.",
    ],
  },
  {
    match: (p) => p.startsWith("/dashboard/governance"),
    suggestions: [
      "Why is this approval considered risky?",
      "What's our typical approval turnaround time?",
      "Which pending approval is riskiest right now?",
    ],
  },
  {
    match: (p) => /^\/dashboard\/experiments\/[^/]+$/.test(p),
    suggestions: [
      "Is this experiment's lift statistically meaningful?",
      "Should we ship the winning variant?",
      "How much longer should this experiment run?",
    ],
  },
  {
    match: (p) => p.startsWith("/dashboard/executive"),
    suggestions: [
      "Which experiment should we prioritize next?",
      "Any flags that need attention this week?",
      "Summarize this week's release risk.",
    ],
  },
];

function suggestionsForPath(path: string): string[] {
  return ROUTE_SUGGESTIONS.find((r) => r.match(path))?.suggestions ?? DEFAULT_SUGGESTIONS;
}

export function AssistantDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function ask(q: string) {
    if (!q.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    startTransition(async () => {
      const result = await askAssistantAction(q);
      if (result.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.answer, source: result.source }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${result.error}` }]);
      }
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-chrome-ask bg-surface px-3 py-1 text-xs font-medium text-chrome-ask transition-colors duration-150 hover:bg-wash"
      >
        Ask
        <kbd className="rounded border border-chrome-ask px-1 font-mono text-[10px]">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20 transition-opacity duration-200"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant"
            className="absolute right-0 top-0 flex h-full w-[420px] max-w-full flex-col border-l border-rule bg-surface shadow-hairline animate-drawer-in"
          >
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 className="text-section-head text-ink">AI Assistant</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label="Close assistant"
                className="text-slate hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestionsForPath(pathname ?? "").map((s) => (
                    <button key={s} className="btn-secondary text-xs" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="text-right">
                    <div className="inline-block max-w-[85%] whitespace-pre-line rounded-control bg-brand-wash px-3 py-2 text-sm text-ink">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="text-left">
                    <p className="whitespace-pre-line text-sm text-ink">{m.content}</p>
                    {m.source && (
                      <p className="mt-1 flex items-center gap-1.5 text-eyebrow uppercase text-mute">
                        <span className="h-1 w-1 rounded-full bg-mute" />
                        {m.source === "groq" ? "Answered via Groq (Llama 3.3 70B)" : "Answered via built-in heuristics engine"}
                      </p>
                    )}
                  </div>
                )
              )}
              {pending && <p className="text-sm text-mute">Thinking…</p>}
            </div>

            <form
              className="flex gap-2 border-t border-rule px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                ask(question);
              }}
            >
              <input
                className="input"
                placeholder="Ask about your flags and experiments…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={pending}
              />
              <button type="submit" className="btn-primary" disabled={pending} aria-busy={pending}>
                Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
