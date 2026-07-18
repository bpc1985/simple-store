"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as subscriptionService from "@/services/subscription-service";
import { useAuth } from "@/lib/auth-context";

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: subscriptionService.getPlans,
    staleTime: 5 * 60 * 1000, // plans change rarely
  });
}

export function useSubscriptionPlan(id: string) {
  return useQuery({
    queryKey: ["subscription-plans", id],
    queryFn: () => subscriptionService.getPlan(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.subscribe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}

export function useMySubscriptions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["my-subscriptions"],
    queryFn: subscriptionService.getMySubscriptions,
    enabled: isAuthenticated,
  });
}

export function useSubscription(id: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["my-subscriptions", id],
    queryFn: () => subscriptionService.getMySubscription(id),
    enabled: isAuthenticated && !!id,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.pauseSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.resumeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
    },
  });
}

export function useCycles(subscriptionId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["subscription-cycles", subscriptionId],
    queryFn: () => subscriptionService.getCycles(subscriptionId),
    enabled: isAuthenticated && !!subscriptionId,
  });
}
