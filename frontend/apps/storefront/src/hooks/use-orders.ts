"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as orderService from "@/services/order-service";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: orderService.getMyOrders,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => orderService.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => orderService.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      shippingAddress: string;
      items: { productId: number; productName: string; quantity: number; unitPrice: number }[];
    }) => orderService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}
