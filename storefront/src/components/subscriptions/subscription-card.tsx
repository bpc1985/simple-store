"use client";

import Link from "next/link";
import type { CustomerSubscription } from "@/types";
import StatusBadge from "@/components/subscriptions/status-badge";
import PriceDisplay from "@/components/ui/price-display";
import { ChevronRight, Box, CalendarDays, RefreshCw } from "lucide-react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function SubscriptionCard({
  subscription,
}: {
  subscription: CustomerSubscription;
}) {
  const { plan, status, nextBillingDate, lastBillingDate, currentCycle } =
    subscription;
  const isEnded = status === "CANCELLED";

  return (
    <Link
      href={`/account/subscriptions/${subscription.id}`}
      className="group flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40"
    >
      {/* Image */}
      <div className="relative w-full sm:w-28 aspect-[4/3] sm:aspect-square bg-muted rounded-lg overflow-hidden shrink-0">
        {plan.imageUrl ? (
          <img
            src={plan.imageUrl}
            alt={plan.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Box className="size-8 text-muted-foreground/30" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-tight">{plan.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <PriceDisplay price={plan.price} size="sm" />
              <span className="text-xs text-muted-foreground">
                / {plan.cadence.toLowerCase()}
              </span>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {!isEnded && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              Next: {formatDate(nextBillingDate)}
            </span>
          )}
          {lastBillingDate && (
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Last: {formatDate(lastBillingDate)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            Cycle {currentCycle}
          </span>
        </div>
      </div>

      <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors self-center sm:self-center">
        <ChevronRight className="size-5" aria-hidden="true" />
      </div>
    </Link>
  );
}
