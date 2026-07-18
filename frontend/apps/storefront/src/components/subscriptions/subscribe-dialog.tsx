"use client";

import { useRouter } from "next/navigation";
import type { SubscriptionPlan } from "@/types";
import { useSubscribe } from "@/hooks/use-subscriptions";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PriceDisplay from "@/components/ui/price-display";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Repeat, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SubscribeDialogProps {
  plan: SubscriptionPlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const cadenceLabel: Record<string, string> = {
  MONTHLY: "per month",
  QUARTERLY: "per quarter",
};

export default function SubscribeDialog({
  plan,
  open,
  onOpenChange,
}: SubscribeDialogProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const subscribe = useSubscribe();

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      onOpenChange(false);
      router.push(
        `/account/login?returnUrl=${encodeURIComponent(window.location.pathname)}`
      );
      return;
    }

    subscribe.mutate(
      { planId: plan.id },
      {
        onSuccess: () => {
          toast.success(`Subscribed to ${plan.name}!`);
          onOpenChange(false);
          router.push("/account/subscriptions");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to subscribe");
        },
      }
    );
  };

  const cadence = cadenceLabel[plan.cadence] ?? plan.cadence;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Subscription</DialogTitle>
          <DialogDescription>
            You are about to subscribe to the following plan. Billing will
            recur {cadence}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          {plan.imageUrl && (
            <img
              src={plan.imageUrl}
              alt={plan.name}
              className="size-16 rounded-lg object-cover bg-muted"
            />
          )}
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold">{plan.name}</h4>
            <div className="flex items-center gap-2">
              <PriceDisplay price={plan.price} size="sm" />
              <Badge variant="secondary" className="text-xs">
                {cadence}
              </Badge>
            </div>
          </div>
        </div>

        {subscribe.isError && (
          <p className="text-sm text-destructive">
            {subscribe.error?.message || "Something went wrong. Please try again."}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubscribe} disabled={subscribe.isPending}>
            {subscribe.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" aria-hidden="true" />
            )}
            Confirm Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
