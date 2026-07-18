"use client";

import Link from "next/link";
import type { SubscriptionPlan } from "@/types";
import PriceDisplay from "@/components/ui/price-display";
import { Badge } from "@simplestore/ui";
import { CalendarDays, Repeat, Box } from "lucide-react";

const cadenceMeta: Record<string, { label: string; icon: typeof CalendarDays }> = {
  MONTHLY: { label: "Monthly", icon: CalendarDays },
  QUARTERLY: { label: "Quarterly", icon: Repeat },
};

export default function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const meta = cadenceMeta[plan.cadence] ?? { label: plan.cadence, icon: CalendarDays };
  const Icon = meta.icon;

  return (
    <Link
      href={`/subscriptions/${plan.id}`}
      className="group flex flex-col rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40"
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/5] bg-muted rounded-xl overflow-hidden">
        {plan.imageUrl ? (
          <img
            src={plan.imageUrl}
            alt={plan.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Box className="size-12 text-muted-foreground/40" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col gap-2 p-4 pt-3">
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {plan.description}
        </p>
        <h3 className="text-lg font-semibold leading-tight">{plan.name}</h3>

        <div className="flex items-center justify-between mt-1">
          <PriceDisplay price={plan.price} size="sm" />
          <Badge variant="secondary" className="gap-1 text-xs">
            <Icon className="size-3" aria-hidden="true" />
            {meta.label}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
