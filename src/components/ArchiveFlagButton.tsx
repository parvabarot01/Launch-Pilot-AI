"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveFlagAction } from "@/app/actions/flags";

export function ArchiveFlagButton({ flagId }: { flagId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      className="btn-danger text-xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("Archive this flag? It will stop evaluating for all consumers.")) return;
        startTransition(async () => {
          await archiveFlagAction(flagId);
          router.push("/dashboard/flags");
        });
      }}
    >
      Archive flag
    </button>
  );
}
