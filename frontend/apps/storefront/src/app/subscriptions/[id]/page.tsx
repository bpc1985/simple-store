"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useSubscriptionPlan } from "@/hooks/use-subscriptions";
import { useAuth } from "@/lib/auth-context";
import SubscribeDialog from "@/components/subscriptions/subscribe-dialog";
import PageHeader from "@/components/ui/page-header";
import PriceDisplay from "@/components/ui/price-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import {
  CalendarDays,
  Repeat,
  Box,
  ShoppingCart,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import type { SubscriptionPlan } from "@/types";

const cadenceMeta: Record<string, { label: string; icon: typeof CalendarDays }> = {
  MONTHLY: { label: "Monthly", icon: CalendarDays },
  QUARTERLY: { label: "Quarterly", icon: Repeat },
};

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: plan, isLoading, error } = useSubscriptionPlan(id);
  const { isAuthenticated } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-[4/5] rounded-xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-48 rounded-lg mt-4" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          icon={Box}
          title="Failed to load plan"
          description={error.message}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          icon={Box}
          title="Plan not found"
          description="The subscription plan you're looking for doesn't exist or has been removed."
          action={{ label: "Browse plans", href: "/subscriptions" }}
        />
      </div>
    );
  }

  const meta = cadenceMeta[plan.cadence] ?? { label: plan.cadence, icon: CalendarDays };
  const Icon = meta.icon;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title={plan.name}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Subscriptions", href: "/subscriptions" },
          { label: plan.name },
        ]}
      />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Image ── */}
        <div className="relative aspect-[4/5] bg-muted rounded-xl overflow-hidden">
          {plan.imageUrl ? (
            <img
              src={plan.imageUrl}
              alt={plan.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Box className="size-20 text-muted-foreground/40" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <PriceDisplay price={plan.price} size="lg" />
            <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
              <Icon className="size-4" aria-hidden="true" />
              {meta.label}
            </Badge>
          </div>

          <p className="text-muted-foreground leading-relaxed">
            {plan.description}
          </p>

          <div className="flex flex-col gap-3 mt-4">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => setDialogOpen(true)}
            >
              Subscribe Now
            </Button>
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Back to plans
            </Link>
          </div>

          <SubscribeDialog
            plan={plan}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        </div>
      </div>
    </div>
  );
}
