import { Skeleton } from "@/components/ui/Skeleton";

export default function HubLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="glass h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="glass h-96 rounded-2xl lg:col-span-2" />
        <Skeleton className="glass h-96 rounded-2xl" />
      </div>
    </div>
  );
}
