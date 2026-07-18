import api from "@/lib/api";
import type {
  SubscriptionPlan,
  CustomerSubscription,
  SubscribeRequest,
  Cycle,
} from "@/types";

export async function getPlans(): Promise<SubscriptionPlan[]> {
  return api.get("/api/v1/subscription/plans");
}

export async function getPlan(id: string): Promise<SubscriptionPlan> {
  return api.get(`/api/v1/subscription/plans/${id}`);
}

export async function getMySubscriptions(): Promise<CustomerSubscription[]> {
  return api.get("/api/v1/subscription/my");
}

export async function getMySubscription(id: string): Promise<CustomerSubscription> {
  return api.get(`/api/v1/subscription/my/${id}`);
}

export async function subscribe(
  data: SubscribeRequest
): Promise<CustomerSubscription> {
  return api.post("/api/v1/subscription/subscribe", data);
}

export async function cancelSubscription(id: string): Promise<void> {
  return api.post(`/api/v1/subscription/${id}/cancel`);
}

export async function pauseSubscription(id: string): Promise<void> {
  return api.post(`/api/v1/subscription/${id}/pause`);
}

export async function resumeSubscription(id: string): Promise<void> {
  return api.post(`/api/v1/subscription/${id}/resume`);
}

export async function getCycles(subscriptionId: string): Promise<Cycle[]> {
  return api.get(`/api/v1/subscription/${subscriptionId}/cycles`);
}
