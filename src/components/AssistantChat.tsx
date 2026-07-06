"use client";

import { useState, useTransition } from "react";
import { askAssistantAction } from "@/app/actions/assistant";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "groq" | "heuristic";
}

export function AssistantChat({ suggestions }: { suggestions: string[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

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
    <div className="card flex h-[32rem] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} className="btn-secondary text-xs" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
            </div>
            {m.role === "assistant" && m.source && (
              <div className="mt-1 text-xs text-slate-400">
                {m.source === "groq" ? "Answered via Groq (Llama 3.3 70B)" : "Answered via built-in heuristics engine"}
              </div>
            )}
          </div>
        ))}
        {pending && <div className="text-sm text-slate-400">Thinking…</div>}
      </div>
      <form
        className="mt-4 flex gap-2 border-t border-slate-100 pt-4"
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
        />
        <button type="submit" className="btn-primary" disabled={pending}>
          Ask
        </button>
      </form>
    </div>
  );
}
