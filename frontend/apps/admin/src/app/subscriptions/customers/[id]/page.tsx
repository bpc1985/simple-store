"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useSubscription,
  useCycles,
  useCancelSubscription,
} from "@/hooks/use-subscriptions";
import { Badge } from "@simplestore/ui";
import { Button } from "@simplestore/ui";
import { Skeleton } from "@simplestore/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@simplestore/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@simplestore/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  ACTIVE: { label: "Active", variant: "default" },
  PAUSED: { label: "Paused", variant: "secondary" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
  PAYMENT_FAILED: { label: "Payment Failed", variant: "destructive" },
};

const cycleStatusMap: Record<string, string> = {
  PENDING: "Pending",
  CHARGED: "Charged",
  FAILED: "Failed",
  ASSEMBLING: "Assembling",
  SHIPPED: "Shipped",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatInstant(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showCancel, setShowCancel] = useState(false);

  const { data: sub, isLoading } = useSubscription(id);
  const { data: cycles, isLoading: cyclesLoading } = useCycles(sub ? id : "");
  const cancelSubscription = useCancelSubscription();

  if (isLoading) {
    return (
      <div className="animate-fade-in max-w-4xl space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="animate-fade-in max-w-4xl">
        <Link
          href="/subscriptions/customers"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Subscriptions
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Subscription not found</p>
        </div>
      </div>
    );
  }

  const st = statusMap[sub.status] ?? { label: sub.status, variant: "secondary" as const };
  const canCancel = sub.status === "ACTIVE" || sub.status === "PAUSED" || sub.status === "PAYMENT_FAILED";

  return (
    <div className="animate-fade-in max-w-4xl">
      <Link
        href="/subscriptions/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Subscriptions
      </Link>

      {/* Detail Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Subscription Detail</CardTitle>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {sub.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={st.variant}>{st.label}</Badge>
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowCancel(true)}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">User ID</p>
              <p className="text-sm font-mono mt-0.5">{sub.userId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Plan</p>
              <p className="text-sm font-medium mt-0.5">
                {sub.plan.name}
                <span className="text-muted-foreground font-normal">
                  {" "}({sub.plan.cadence === "MONTHLY" ? "Monthly" : "Quarterly"})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Locked Price</p>
              <p className="text-sm font-mono mt-0.5">{formatCurrency(sub.plan.price)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Start Date</p>
              <p className="text-sm mt-0.5">{formatDate(sub.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Next Billing</p>
              <p className="text-sm mt-0.5">
                {sub.status === "CANCELLED" ? "—" : formatDate(sub.nextBillingDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Billing</p>
              <p className="text-sm mt-0.5">{formatDate(sub.lastBillingDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Cycle</p>
              <p className="text-sm font-mono mt-0.5">#{sub.currentCycle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycle History */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Billing Cycle History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cyclesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : cycles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <p className="text-sm text-muted-foreground">
                        No billing cycles yet
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  cycles?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs tabular-nums">
                        #{c.cycleNumber}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === "CHARGED"
                              ? "default"
                              : c.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[0.625rem]"
                        >
                          {cycleStatusMap[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatInstant(c.scheduledDate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatInstant(c.completedDate)}
                      </TableCell>
                      <TableCell className="font-mono text-[0.6875rem] text-muted-foreground">
                        {c.paymentTransactionId
                          ? c.paymentTransactionId.slice(0, 10) + "..."
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this subscription? This will
              immediately stop all future billing cycles. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => cancelSubscription.mutate(id)}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
