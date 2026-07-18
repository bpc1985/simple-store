"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMySubscriptions, useCycles, useCancelSubscription, usePauseSubscription, useResumeSubscription } from "@/hooks/use-subscriptions";
import { useAuth } from "@/lib/auth-context";
import StatusBadge from "@/components/subscriptions/status-badge";
import CycleList from "@/components/subscriptions/cycle-list";
import PriceDisplay from "@/components/ui/price-display";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  RefreshCw,
  Pause,
  Play,
  X,
  Box,
  User,
  Loader2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { CustomerSubscription } from "@/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

type Action = "pause" | "resume" | "cancel" | null;

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: subscriptions, isLoading: subsLoading, error: subsError } = useMySubscriptions();
  const { data: cycles, isLoading: cyclesLoading } = useCycles(id);

  const cancelMutation = useCancelSubscription();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();

  const [action, setAction] = useState<Action>(null);

  const subscription: CustomerSubscription | undefined = subscriptions?.find((s) => s.id === id);

  // ── Loading ──
  if (authLoading || subsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={User}
          title="Login Required"
          description="Please log in to view your subscription."
          action={{ label: "Go to Login", href: "/account/login" }}
        />
      </div>
    );
  }

  // ── Error ──
  if (subsError) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={Box}
          title="Failed to load subscription"
          description={subsError.message}
        />
      </div>
    );
  }

  // ── Not found ──
  if (!subscription) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={Box}
          title="Subscription not found"
          description="This subscription doesn't exist or you don't have access to it."
          action={{ label: "Back to subscriptions", href: "/account/subscriptions" }}
        />
      </div>
    );
  }

  const { plan, status, startDate, nextBillingDate, lastBillingDate, currentCycle } = subscription;
  const isEnded = status === "CANCELLED";

  // ── Action handlers ──
  const handleConfirm = () => {
    const subId = subscription.id;
    switch (action) {
      case "pause":
        pauseMutation.mutate(subId, {
          onSuccess: () => {
            toast.success("Subscription paused");
            setAction(null);
          },
          onError: (err) => toast.error(err.message || "Failed to pause"),
        });
        break;
      case "resume":
        resumeMutation.mutate(subId, {
          onSuccess: () => {
            toast.success("Subscription resumed");
            setAction(null);
          },
          onError: (err) => toast.error(err.message || "Failed to resume"),
        });
        break;
      case "cancel":
        cancelMutation.mutate(subId, {
          onSuccess: () => {
            toast.success("Subscription cancelled");
            setAction(null);
          },
          onError: (err) => toast.error(err.message || "Failed to cancel"),
        });
        break;
    }
  };

  const isMutating =
    pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title={plan.name}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account" },
          { label: "Subscriptions", href: "/account/subscriptions" },
          { label: plan.name },
        ]}
      />

      {/* ── Summary Card ── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {plan.imageUrl && (
              <img
                src={plan.imageUrl}
                alt={plan.name}
                className="size-16 rounded-lg object-cover bg-muted shrink-0"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {plan.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <PriceDisplay price={plan.price} size="sm" />
                <Badge variant="secondary" className="text-xs">
                  {plan.cadence.toLowerCase()}
                </Badge>
              </div>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Billing info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Start Date</p>
            <p className="font-medium mt-0.5">{formatDate(startDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Billing</p>
            <p className="font-medium mt-0.5">{formatDate(lastBillingDate)}</p>
          </div>
          {!isEnded && (
            <div>
              <p className="text-muted-foreground">Next Billing</p>
              <p className="font-medium mt-0.5">{formatDate(nextBillingDate)}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Cycles</p>
            <p className="font-medium tabular-nums mt-0.5">{currentCycle}</p>
          </div>
        </div>

        {/* Status notice */}
        {status === "CANCELLED" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <X className="size-4 shrink-0" aria-hidden="true" />
            This subscription was cancelled and is no longer active.
          </div>
        )}
        {status === "PAYMENT_FAILED" && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Payment failed. Please resume to retry billing.
          </div>
        )}

        {/* Action buttons */}
        {!isEnded && (
          <div className="flex flex-wrap gap-2 pt-2">
            {status === "ACTIVE" && (
              <Button
                variant="outline"
                onClick={() => setAction("pause")}
              >
                <Pause className="size-4" />
                Pause
              </Button>
            )}
            {(status === "PAUSED" || status === "PAYMENT_FAILED") && (
              <Button onClick={() => setAction("resume")}>
                <Play className="size-4" />
                Resume
              </Button>
            )}
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 border-destructive/30"
              onClick={() => setAction("cancel")}
            >
              <X className="size-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── Billing History ── */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Billing History</h3>
        <CycleList cycles={cycles ?? []} isLoading={cyclesLoading} />
      </div>

      {/* Back link */}
      <Link
        href="/account/subscriptions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to subscriptions
      </Link>

      {/* ── Action Dialogs ── */}
      <Dialog open={action !== null} onOpenChange={() => setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "pause" && "Pause Subscription"}
              {action === "resume" && "Resume Subscription"}
              {action === "cancel" && "Cancel Subscription"}
            </DialogTitle>
            <DialogDescription>
              {action === "pause" &&
                `Pause billing for ${plan.name}? You can resume anytime.`}
              {action === "resume" && (
                <>
                  Resume {plan.name}?{" "}
                  <span className="text-amber-600 font-medium">
                    ⚠️ Billing will restart from today. Your next charge may
                    occur as soon as tonight.
                  </span>
                </>
              )}
              {action === "cancel" &&
                `Are you sure you want to cancel ${plan.name}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Go Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isMutating}
              variant={action === "cancel" ? "destructive" : "default"}
            >
              {isMutating && (
                <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
              )}
              {action === "pause" && "Pause"}
              {action === "resume" && "Resume"}
              {action === "cancel" && "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
