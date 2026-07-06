"use client";

import { useState, useTransition } from "react";
import { updateFlagStateAction } from "@/app/actions/flags";
import type { RuleOperator, TargetingRule } from "@/lib/types";

const OPERATORS: RuleOperator[] = ["equals", "not_equals", "contains", "in", "gt", "lt"];

export function FlagStateEditor({
  flagId,
  environmentId,
  initialEnabled,
  initialKillSwitch,
  initialRollout,
  initialRules,
}: {
  flagId: string;
  environmentId: string;
  initialEnabled: boolean;
  initialKillSwitch: boolean;
  initialRollout: number;
  initialRules: TargetingRule[];
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [killSwitch, setKillSwitch] = useState(initialKillSwitch);
  const [rollout, setRollout] = useState(initialRollout);
  const [rules, setRules] = useState<TargetingRule[]>(initialRules);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(input: Omit<Parameters<typeof updateFlagStateAction>[1], "environmentId">) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateFlagStateAction(flagId, { environmentId, ...input });
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
      } else if (result.approvalRequested) {
        setMessage("Rollout increase exceeds the governance threshold — an approval request was created.");
      } else {
        setMessage("Saved.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Enabled</h3>
          <p className="text-sm text-slate-500">Master switch for this environment.</p>
        </div>
        <ToggleButton
          on={enabled}
          disabled={pending}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            apply({ enabled: next });
          }}
        />
      </div>

      <div className="card flex items-center justify-between border-red-100">
        <div>
          <h3 className="font-semibold text-red-700">Kill switch</h3>
          <p className="text-sm text-slate-500">Forces this flag off for everyone, instantly, regardless of rollout %.</p>
        </div>
        <ToggleButton
          on={killSwitch}
          danger
          disabled={pending}
          onClick={() => {
            const next = !killSwitch;
            setKillSwitch(next);
            apply({ killSwitch: next });
          }}
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Rollout percentage</h3>
          <span className="text-lg font-bold text-brand-600">{rollout}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={rollout}
          onChange={(e) => setRollout(Number(e.target.value))}
          className="mt-3 w-full"
        />
        <p className="mt-2 text-xs text-slate-500">
          Increases of 50 points or more, or reaching 100%, require admin/owner approval.
        </p>
        <button
          className="btn-primary mt-3"
          disabled={pending || rollout === initialRollout}
          onClick={() => apply({ rolloutPercentage: rollout })}
        >
          Apply rollout change
        </button>
      </div>

      <div className="card">
        <h3 className="font-semibold text-slate-900">Targeting rules</h3>
        <p className="text-sm text-slate-500">
          Users matching any rule below are always on, before rollout percentage is considered.
        </p>
        <div className="mt-4 space-y-3">
          {rules.map((rule, i) => (
            <div key={rule.id ?? i} className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-3"
                placeholder="attribute (e.g. plan)"
                value={rule.attribute}
                onChange={(e) => {
                  const next = [...rules];
                  next[i] = { ...next[i], attribute: e.target.value };
                  setRules(next);
                }}
              />
              <select
                className="input col-span-3"
                value={rule.operator}
                onChange={(e) => {
                  const next = [...rules];
                  next[i] = { ...next[i], operator: e.target.value as RuleOperator };
                  setRules(next);
                }}
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <input
                className="input col-span-5"
                placeholder="value (e.g. enterprise)"
                value={rule.value}
                onChange={(e) => {
                  const next = [...rules];
                  next[i] = { ...next[i], value: e.target.value };
                  setRules(next);
                }}
              />
              <button
                className="btn-secondary col-span-1"
                onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            className="btn-secondary"
            onClick={() =>
              setRules([...rules, { id: `new-${rules.length}-${Date.now()}`, attribute: "", operator: "equals", value: "" }])
            }
          >
            Add rule
          </button>
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              apply({
                targetingRules: rules
                  .filter((r) => r.attribute && r.value)
                  .map(({ attribute, operator, value, description }) => ({ attribute, operator, value, description })),
              })
            }
          >
            Save targeting rules
          </button>
        </div>
      </div>

      {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function ToggleButton({
  on,
  onClick,
  disabled,
  danger,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        on ? (danger ? "bg-red-600" : "bg-brand-600") : "bg-slate-300"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
