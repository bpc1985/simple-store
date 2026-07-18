"use client";

import { useSubscriptionPlans } from "@/hooks/use-subscriptions";
import PlanCard from "@/components/subscriptions/plan-card";
import PageHeader from "@/components/ui/page-header";
import { Skeleton } from "@simplestore/ui";
import EmptyState from "@/components/ui/empty-state";
import { PackageSearch } from "lucide-react";

function PlanCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl bg-card">
      <Skeleton className="aspect-[4/5] rounded-xl" />
      <div className="flex flex-col gap-2 p-4 pt-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex items-center justify-between mt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { data: plans, isLoading, error } = useSubscriptionPlans();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title="Subscription Boxes"
        description="Discover curated boxes delivered to your door on your schedule."
      />

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <EmptyState
          icon={PackageSearch}
          title="Failed to load plans"
          description={error.message}
          action={{ label: "Try again", href: "/subscriptions" }}
        />
      )}

      {plans && plans.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="No subscription plans available"
          description="Check back soon — we're preparing new boxes for you."
        />
      )}

      {plans && plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
