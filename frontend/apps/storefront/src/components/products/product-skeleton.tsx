import { Skeleton } from "@simplestore/ui";

export default function ProductSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}
