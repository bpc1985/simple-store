import api from "@/lib/api";
import type { OrderDto } from "@/types";

export async function createOrder(data: {
  shippingAddress: string;
  items: { productId: number; productName: string; quantity: number; unitPrice: number }[];
}): Promise<OrderDto> {
  return api.post("/api/v1/order/orders", data);
}

export async function cancelOrder(id: number): Promise<OrderDto> {
  return api.post(`/api/v1/order/orders/${id}/cancel`);
}

export async function getMyOrders(): Promise<OrderDto[]> {
  return api.get("/api/v1/order/orders");
}

export async function getOrder(id: string): Promise<OrderDto> {
  return api.get(`/api/v1/order/orders/${id}`);
}
