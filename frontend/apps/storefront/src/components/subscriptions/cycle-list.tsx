"use client";

import type { Cycle } from "@/types";
import StatusBadge from "@/components/subscriptions/status-badge";
import { Skeleton } from "@simplestore/ui";
import { Card, CardContent } from "@simplestore/ui";
import { History } from "lucide-react";

function formatInstant(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function truncateTxId(id: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

interface CycleListProps {
  cycles: Cycle[];
  isLoading: boolean;
}

export default function CycleList({ cycles, isLoading }: CycleListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <History className="size-10 opacity-30" aria-hidden="true" />
        <p className="text-sm">No billing cycles yet</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                Cycle #
              </th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                Scheduled
              </th>
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">
                Transaction
              </th>
              <th className="text-left py-2 font-medium text-muted-foreground">
                Completed
              </th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => (
              <tr key={c.id} className="border-b border-border/50">
                <td className="py-3 pr-4 tabular-nums">{c.cycleNumber}</td>
                <td className="py-3 pr-4">
                  <StatusBadge status={c.status} variant="cycle" />
                </td>
                <td className="py-3 pr-4 text-muted-foreground">
                  {formatInstant(c.scheduledDate)}
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                  {truncateTxId(c.paymentTransactionId)}
                </td>
                <td className="py-3 text-muted-foreground">
                  {formatInstant(c.completedDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {cycles.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold tabular-nums">
                  Cycle #{c.cycleNumber}
                </span>
                <StatusBadge status={c.status} variant="cycle" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Scheduled</span>
                  <p>{formatInstant(c.scheduledDate)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Completed</span>
                  <p>{formatInstant(c.completedDate)}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Transaction</span>
                  <p className="font-mono text-xs">
                    {truncateTxId(c.paymentTransactionId)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
