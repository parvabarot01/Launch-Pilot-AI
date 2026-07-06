"use client";

import { useRef, useState, useTransition } from "react";
import { addMemberAction } from "@/app/actions/members";

export function AddMemberForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await addMemberAction(formData);
          if (!result.ok) setError(result.error ?? "Something went wrong");
          else formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div>
        <label className="label">Email of existing LaunchPilot user</label>
        <input name="email" type="email" required className="input" placeholder="teammate@company.com" />
      </div>
      <div>
        <label className="label">Role</label>
        <select name="role" className="input" defaultValue="member">
          <option value="viewer">Viewer</option>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add member"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
