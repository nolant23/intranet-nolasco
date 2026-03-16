import { cn } from "@/lib/utils";

export function TableSkeleton({ rows = 10, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl border border-slate-200 bg-white p-6", className)}>
      <div className="mb-4 h-8 w-48 rounded-lg bg-slate-200" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 flex-1 rounded-lg bg-slate-100" />
            <div className="h-10 w-24 rounded-lg bg-slate-100" />
            <div className="h-10 w-32 rounded-lg bg-slate-100" />
            <div className="h-10 w-20 rounded-lg bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <div className="h-24 w-full max-w-md rounded-2xl bg-slate-100 animate-pulse" />
      <TableSkeleton rows={12} />
    </div>
  );
}
