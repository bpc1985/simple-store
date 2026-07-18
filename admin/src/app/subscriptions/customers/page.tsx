"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSubscriptions } from "@/hooks/use-subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Users, Search } from "lucide-react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ACTIVE: { label: "Active", variant: "default" },
  PAUSED: { label: "Paused", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  PAYMENT_FAILED: { label: "Payment Failed", variant: "destructive" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function CustomerSubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [debouncedUserId, setDebouncedUserId] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedUserId(userIdFilter);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [userIdFilter]);

  const { data: subscriptions, isLoading } = useSubscriptions(
    debouncedUserId || statusFilter
      ? {
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(debouncedUserId ? { userId: debouncedUserId } : {}),
        }
      : undefined
  );

  return (
    <div className="animate-fade-in max-w-7xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Customer Subscriptions
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {subscriptions
            ? `${subscriptions.length} subscriptions`
            : "Loading..."}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v === "ALL" || !v ? "" : v)}
          >
            <SelectTrigger className="w-40">
              {statusFilter
                ? statusMap[statusFilter]?.label
                : "All Statuses"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="PAYMENT_FAILED">Payment Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by User ID..."
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
        </div>
        {(statusFilter || userIdFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("");
              setUserIdFilter("");
            }}
            className="text-xs"
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscription ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className="text-right">Next Billing</TableHead>
              <TableHead className="w-16">Cycle</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : subscriptions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No subscriptions found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              subscriptions?.map((sub) => {
                const st = statusMap[sub.status] ?? {
                  label: sub.status,
                  variant: "secondary" as const,
                };
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sub.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {sub.userId.slice(0, 12)}...
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {sub.plan.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant} className="text-[0.625rem]">
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(sub.startDate)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right tabular-nums">
                      {sub.status === "CANCELLED"
                        ? "—"
                        : formatDate(sub.nextBillingDate)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-center">
                      {sub.currentCycle}
                    </TableCell>
                    <TableCell>
                      <Link href={`/subscriptions/customers/${sub.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="size-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
