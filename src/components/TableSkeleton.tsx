export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden !p-0">
      <div className="h-11 border-b border-rule bg-wash" />
      <div className="divide-y divide-rule">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-6 px-6">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-3 flex-1 rounded-full bg-rule" style={{ maxWidth: j === 0 ? "40%" : "15%" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
