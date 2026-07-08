import { TableSkeleton } from "@/components/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-8 w-64 rounded-full bg-rule" />
      <div className="card h-24" />
      <TableSkeleton rows={4} cols={5} />
    </div>
  );
}
