import { TableSkeleton } from "@/components/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-full bg-rule" />
      <div className="card h-20" />
      <TableSkeleton rows={8} cols={4} />
    </div>
  );
}
