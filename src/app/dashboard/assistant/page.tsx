import { AssistantChat } from "@/components/AssistantChat";

const SUGGESTIONS = [
  "Which experiment should we prioritize next?",
  "Why did any experiments fail to show an effect?",
  "Is the checkout experiment's lift statistically meaningful?",
  "Should we increase rollout on any flags?",
];

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Decision Assistant</h1>
        <p className="text-sm text-slate-500">
          Grounded in your org&apos;s real flag and experiment data for the current environment. Set{" "}
          <code className="rounded bg-slate-100 px-1">GROQ_API_KEY</code> to upgrade answers to a full
          language model — without it, this runs a built-in statistical heuristics engine.
        </p>
      </div>
      <AssistantChat suggestions={SUGGESTIONS} />
    </div>
  );
}
