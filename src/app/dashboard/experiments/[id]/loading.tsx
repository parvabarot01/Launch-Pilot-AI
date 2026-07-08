import { TableSkeleton } from "@/components/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 rounded-full bg-rule" />
      <div className="card h-10" />
      <TableSkeleton rows={3} cols={6} />
    </div>
  );
}
