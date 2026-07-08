import { TableSkeleton } from "@/components/TableSkeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-full bg-rule" />
      <TableSkeleton rows={5} cols={4} />
    </div>
  );
}
