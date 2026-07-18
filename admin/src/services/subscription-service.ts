import { api } from "@/lib/api";
import {
  SubscriptionPlan,
  CustomerSubscription,
  Cycle,
  CreatePlanRequest,
  UpdatePlanRequest,
} from "@/types";

// ── Plans ────────────────────────────────────────────────────────────────

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get<SubscriptionPlan[]>(
    "/api/v1/subscription/admin/plans"
  );
  return data;
}

export async function createPlan(
  request: CreatePlanRequest
): Promise<SubscriptionPlan> {
  const { data } = await api.post<SubscriptionPlan>(
    "/api/v1/subscription/admin/plans",
    request
  );
  return data;
}

export async function updatePlan(
  id: number,
  request: UpdatePlanRequest
): Promise<SubscriptionPlan> {
  const { data } = await api.put<SubscriptionPlan>(
    `/api/v1/subscription/admin/plans/${id}`,
    request
  );
  return data;
}

// ── Customer Subscriptions ───────────────────────────────────────────────

export async function getSubscriptions(params?: {
  status?: string;
  userId?: string;
}): Promise<CustomerSubscription[]> {
  const { data } = await api.get<CustomerSubscription[]>(
    "/api/v1/subscription/admin/subscriptions",
    { params }
  );
  return data;
}

export async function getSubscription(
  id: string
): Promise<CustomerSubscription> {
  const { data } = await api.get<CustomerSubscription>(
    `/api/v1/subscription/admin/subscriptions/${id}`
  );
  return data;
}

export async function cancelSubscription(id: string): Promise<void> {
  await api.post(`/api/v1/subscription/admin/subscriptions/${id}/cancel`);
}

export async function getCycles(subscriptionId: string): Promise<Cycle[]> {
  const { data } = await api.get<Cycle[]>(
    `/api/v1/subscription/admin/subscriptions/${subscriptionId}/cycles`
  );
  return data;
}
