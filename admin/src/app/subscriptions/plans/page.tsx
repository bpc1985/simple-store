"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlans, useUpdatePlan } from "@/hooks/use-subscriptions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Package } from "lucide-react";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function PlansPage() {
  const { data: plans, isLoading } = usePlans();
  const updatePlan = useUpdatePlan();
  const [updatingPlanId, setUpdatingPlanId] = useState<number | null>(null);

  return (
    <div className="animate-fade-in max-w-7xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Subscription Plans
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {plans ? `${plans.length} plans` : "Loading..."}
          </p>
        </div>
        <Link href="/subscriptions/plans/new">
          <Button>
            <Plus className="size-4" />
            Create Plan
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Cadence</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : plans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No subscription plans found
                    </p>
                    <Link href="/subscriptions/plans/new">
                      <Button variant="outline" size="sm">
                        <Plus className="size-3.5" />
                        Create your first plan
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              plans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    #{plan.id}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{plan.name}</div>
                    {plan.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {plan.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {plan.cadence === "MONTHLY" ? "Monthly" : "Quarterly"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-right tabular-nums text-sm">
                    {formatCurrency(plan.price)}
                    {plan.cadence === "MONTHLY" ? "/mo" : "/qtr"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.active}
                        disabled={updatingPlanId === plan.id}
                        onCheckedChange={() => {
                          setUpdatingPlanId(plan.id);
                          updatePlan.mutate(
                            { id: plan.id, active: !plan.active },
                            { onSettled: () => setUpdatingPlanId(null) }
                          );
                        }}
                      />
                      <Badge
                        variant={plan.active ? "default" : "secondary"}
                        className="text-[0.625rem]"
                      >
                        {plan.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/subscriptions/plans/${plan.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="size-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
