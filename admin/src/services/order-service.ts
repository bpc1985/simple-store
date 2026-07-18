import { api } from "@/lib/api";
import { Order, PagedResult, OrderStats } from "@/types";

export async function getOrders(page = 0): Promise<PagedResult<Order>> {
  const { data } = await api.get<PagedResult<Order>>("/api/v1/order/admin/orders", { params: { page } });
  return data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await api.get<Order>(`/api/v1/order/admin/orders/${id}`);
  return data;
}

export async function getStats(): Promise<OrderStats> {
  const { data } = await api.get<OrderStats>("/api/v1/order/admin/orders/stats");
  return data;
}

export async function updateOrderStatus(id: number, status: string): Promise<void> {
  await api.patch(`/api/v1/order/admin/orders/${id}/status`, { status });
}
