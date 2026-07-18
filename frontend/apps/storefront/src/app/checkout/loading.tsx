import { Skeleton } from "@simplestore/ui";

export default function CheckoutLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <Skeleton className="h-8 w-40 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
