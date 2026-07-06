"use client";

import { useRef, useState, useTransition } from "react";
import { createFlagAction } from "@/app/actions/flags";

export function CreateFlagForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        New flag
      </button>
    );
  }

  return (
    <div className="card">
      <form
        ref={formRef}
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await createFlagAction(formData);
            if (!result.ok) {
              setError(result.error ?? "Something went wrong");
            } else {
              formRef.current?.reset();
              setOpen(false);
            }
          });
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <div>
          <label className="label">Key</label>
          <input name="key" required pattern="[a-z0-9][a-z0-9-_]*" className="input" placeholder="new-checkout-flow" />
        </div>
        <div>
          <label className="label">Name</label>
          <input name="name" required className="input" placeholder="New Checkout Flow" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea name="description" className="input" rows={2} />
        </div>
        {error && (
          <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Creating…" : "Create flag"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
