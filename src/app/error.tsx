"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-600 text-lg font-bold text-white">
        !
      </div>
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        An unexpected error occurred. You can try again, or head back to the dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <button className="btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <a href="/dashboard" className="btn-secondary">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}
