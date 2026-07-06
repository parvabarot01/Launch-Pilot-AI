"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/auth";

export function AuthForm({
  action,
  submitLabel,
  fields,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  fields: { name: string; label: string; type: string; placeholder?: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await action(formData);
          if (!result.ok) {
            setError(result.error ?? "Something went wrong");
          }
        });
      }}
      className="space-y-4"
    >
      {fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>
            {f.label}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            required
            placeholder={f.placeholder}
            className="input"
          />
        </div>
      ))}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
