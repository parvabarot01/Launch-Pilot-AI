import type { ReactNode } from "react";

const CHROME_TEXT: Record<"ship" | "oversee", string> = {
  ship: "text-chrome-ship",
  oversee: "text-chrome-oversee",
};

export function EmptyState({
  title,
  chrome = "ship",
  action,
}: {
  title: string;
  chrome?: "ship" | "oversee";
  action?: ReactNode;
}) {
  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-4 px-6 text-center">
      <svg
        className={`h-8 w-8 ${CHROME_TEXT[chrome]}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-section-head text-ink">{title}</p>
      {action}
    </div>
  );
}
