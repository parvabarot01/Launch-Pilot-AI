"use client";

import { useState, useTransition } from "react";
import { updateFlagStateAction } from "@/app/actions/flags";
import { riskSpineClass, type RiskToken } from "@/lib/risk";
import { useToast } from "@/components/Toast";
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
  const [pending, startTransition] = useTransition();
  const showToast = useToast();

  const stateToken: RiskToken = killSwitch ? "halt" : enabled ? "clear" : "inert";

  function apply(input: Omit<Parameters<typeof updateFlagStateAction>[1], "environmentId">) {
    startTransition(async () => {
      const result = await updateFlagStateAction(flagId, { environmentId, ...input });
      if (!result.ok) {
        showToast(result.error ?? "Something went wrong", "halt");
      } else if (result.approvalRequested) {
        showToast("Rollout increase exceeds the governance threshold — an approval request was created.");
      } else {
        showToast("Saved.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div
        key={`enabled-${stateToken}`}
        className={`card flex animate-lift-settle items-center justify-between transition-colors duration-[400ms] ${riskSpineClass(stateToken)}`}
      >
        <div>
          <h3 className="font-semibold text-ink">Enabled</h3>
          <p className="text-sm text-slate">Master switch for this environment.</p>
        </div>
        <ToggleButton
          on={enabled}
          disabled={pending}
          busy={pending}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            apply({ enabled: next });
          }}
        />
      </div>

      <div
        key={`kill-${stateToken}`}
        className={`card flex animate-lift-settle items-center justify-between transition-colors duration-[400ms] ${riskSpineClass(stateToken)}`}
      >
        <div>
          <h3 className="font-semibold text-risk-halt">Kill switch</h3>
          <p className="text-sm text-slate">Forces this flag off for everyone, instantly, regardless of rollout %.</p>
        </div>
        <ToggleButton
          on={killSwitch}
          danger
          disabled={pending}
          busy={pending}
          onClick={() => {
            const next = !killSwitch;
            setKillSwitch(next);
            apply({ killSwitch: next });
          }}
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Rollout percentage</h3>
          <span className="font-mono text-lg font-bold text-brand">{rollout}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={rollout}
          onChange={(e) => setRollout(Number(e.target.value))}
          className="mt-3 w-full accent-brand"
        />
        <p className="mt-2 text-xs text-slate">
          Increases of 50 points or more, or reaching 100%, require admin/owner approval.
        </p>
        <button
          className="btn-primary mt-3"
          disabled={pending || rollout === initialRollout}
          aria-busy={pending}
          onClick={() => apply({ rolloutPercentage: rollout })}
        >
          Apply rollout change
        </button>
      </div>

      <div className="card">
        <h3 className="font-semibold text-ink">Targeting rules</h3>
        <p className="text-sm text-slate">
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
                type="button"
                className="btn-secondary col-span-1"
                aria-label={`Remove rule ${i + 1}`}
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
            aria-busy={pending}
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
    </div>
  );
}

function ToggleButton({
  on,
  onClick,
  disabled,
  danger,
  busy,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={busy}
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition-colors duration-150 ${
        on ? (danger ? "bg-risk-halt" : "bg-brand") : "bg-rule"
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
