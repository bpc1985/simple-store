"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as subscriptionService from "@/services/subscription-service";
import type { CreatePlanRequest, UpdatePlanRequest } from "@/types";

// ── Plans ────────────────────────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: subscriptionService.getPlans,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreatePlanRequest) =>
      subscriptionService.createPlan(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plan created");
    },
    onError: () => toast.error("Failed to create plan"),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...request }: { id: number } & UpdatePlanRequest) =>
      subscriptionService.updatePlan(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success("Plan updated");
    },
    onError: () => toast.error("Failed to update plan"),
  });
}

// ── Customer Subscriptions ───────────────────────────────────────────────

export function useSubscriptions(params?: {
  status?: string;
  userId?: string;
}) {
  return useQuery({
    queryKey: ["admin-subscriptions", params],
    queryFn: () => subscriptionService.getSubscriptions(params),
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: ["admin-subscriptions", id],
    queryFn: () => subscriptionService.getSubscription(id),
    enabled: !!id,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subscriptionService.cancelSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription cancelled");
    },
    onError: () => toast.error("Failed to cancel subscription"),
  });
}

export function useCycles(subscriptionId: string) {
  return useQuery({
    queryKey: ["admin-subscriptions", subscriptionId, "cycles"],
    queryFn: () => subscriptionService.getCycles(subscriptionId),
    enabled: !!subscriptionId,
  });
}

// ── Dashboard Stats ──────────────────────────────────────────────────────

export function useSubscriptionStats() {
  return useQuery({
    queryKey: ["admin-subscriptions", "stats"],
    queryFn: async () => {
      const subs = await subscriptionService.getSubscriptions();
      const active = subs.filter((s) => s.status === "ACTIVE").length;
      const mrr = subs
        .filter((s) => s.status === "ACTIVE")
        .reduce((sum, s) => {
          const monthlyPrice =
            s.plan.cadence === "QUARTERLY"
              ? s.plan.price / 3
              : s.plan.price;
          return sum + monthlyPrice;
        }, 0);
      return { activeCount: active, mrr };
    },
  });
}
