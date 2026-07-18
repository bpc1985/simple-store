"use client";

import Link from "next/link";
import { useMySubscriptions } from "@/hooks/use-subscriptions";
import { useAuth } from "@/lib/auth-context";
import SubscriptionCard from "@/components/subscriptions/subscription-card";
import PageHeader from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { Box, User } from "lucide-react";

function SubscriptionCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-5">
      <Skeleton className="w-full sm:w-28 aspect-[4/3] sm:aspect-square rounded-lg" />
      <div className="flex-1 flex flex-col justify-between gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}

export default function MySubscriptionsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: subscriptions, isLoading, error } = useMySubscriptions();

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 2 }).map((_, i) => (
          <SubscriptionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={User}
          title="Login Required"
          description="Please log in to view your subscriptions."
          action={{ label: "Go to Login", href: "/account/login" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="My Subscriptions"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account" },
          { label: "Subscriptions" },
        ]}
      />

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <SubscriptionCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <EmptyState
          icon={Box}
          title="Failed to load subscriptions"
          description={error.message}
        />
      )}

      {subscriptions && subscriptions.length === 0 && (
        <EmptyState
          icon={Box}
          title="No subscriptions yet"
          description="Discover curated boxes delivered to your door."
          action={{ label: "Browse Plans", href: "/subscriptions" }}
        />
      )}

      {subscriptions && subscriptions.length > 0 && (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
