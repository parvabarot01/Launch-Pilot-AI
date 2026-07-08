export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-full bg-rule" />
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
    </div>
  );
}
