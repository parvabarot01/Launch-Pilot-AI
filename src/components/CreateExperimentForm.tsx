"use client";

import { useState, useTransition } from "react";
import { createExperimentAction } from "@/app/actions/experiments";
import type { FeatureFlag } from "@/lib/types";

interface VariantDraft {
  key: string;
  name: string;
  allocationPercentage: number;
  isControl: boolean;
}

export function CreateExperimentForm({
  environmentId,
  flags,
}: {
  environmentId: string;
  flags: FeatureFlag[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  const [minimumSampleSize, setMinimumSampleSize] = useState(1000);
  const [flagId, setFlagId] = useState<string>("");
  const [variants, setVariants] = useState<VariantDraft[]>([
    { key: "control", name: "Control", allocationPercentage: 50, isControl: true },
    { key: "treatment", name: "Treatment", allocationPercentage: 50, isControl: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        New experiment
      </button>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Attach to flag (optional)</label>
          <select className="input" value={flagId} onChange={(e) => setFlagId(e.target.value)}>
            <option value="">None</option>
            {flags.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Hypothesis</label>
          <textarea className="input" rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
        </div>
        <div>
          <label className="label">Success metric</label>
          <input className="input" value={successMetric} onChange={(e) => setSuccessMetric(e.target.value)} placeholder="Purchase conversion rate" />
        </div>
        <div>
          <label className="label">Minimum sample size (per variant)</label>
          <input
            type="number"
            className="input"
            value={minimumSampleSize}
            onChange={(e) => setMinimumSampleSize(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="label">Variants (allocation must total 100%)</label>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-3"
                placeholder="key"
                value={v.key}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...next[i], key: e.target.value };
                  setVariants(next);
                }}
              />
              <input
                className="input col-span-4"
                placeholder="name"
                value={v.name}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...next[i], name: e.target.value };
                  setVariants(next);
                }}
              />
              <input
                type="number"
                className="input col-span-2"
                value={v.allocationPercentage}
                onChange={(e) => {
                  const next = [...variants];
                  next[i] = { ...next[i], allocationPercentage: Number(e.target.value) };
                  setVariants(next);
                }}
              />
              <label className="col-span-2 flex items-center gap-1 text-xs">
                <input
                  type="radio"
                  name="control"
                  checked={v.isControl}
                  onChange={() => setVariants(variants.map((vv, idx) => ({ ...vv, isControl: idx === i })))}
                />
                Control
              </label>
              <button
                className="btn-secondary col-span-1"
                onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn-secondary mt-2"
          onClick={() =>
            setVariants([
              ...variants,
              { key: `variant-${variants.length}`, name: `Variant ${variants.length}`, allocationPercentage: 0, isControl: false },
            ])
          }
        >
          Add variant
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await createExperimentAction({
                environmentId,
                flagId: flagId || null,
                name,
                hypothesis,
                successMetric,
                minimumSampleSize,
                variants,
              });
              if (!result.ok) {
                setError(result.error ?? "Something went wrong");
              } else {
                setOpen(false);
              }
            })
          }
        >
          {pending ? "Creating…" : "Create experiment"}
        </button>
        <button className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
