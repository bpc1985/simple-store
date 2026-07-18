"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as cartService from "@/services/cart-service";

function getCartId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("cartId") || undefined;
}

function ensureCartId(): string {
  let cartId = localStorage.getItem("cartId");
  if (!cartId) {
    cartId = crypto.randomUUID();
    localStorage.setItem("cartId", cartId);
  }
  return cartId;
}

export function useCart() {
  const cartId = getCartId();
  return useQuery({
    queryKey: ["cart", cartId],
    queryFn: () => cartService.getCart(cartId),
    enabled: !!cartId,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      productName,
      price,
      imageUrl,
      quantity,
    }: {
      productId: number;
      productName: string;
      price: number;
      imageUrl: string;
      quantity: number;
    }) => {
      const id = ensureCartId();
      return cartService.addToCart(productId, productName, price, imageUrl, quantity, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const cartId = getCartId();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: number;
      quantity: number;
    }) => cartService.updateCartItem(productId, quantity, cartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const cartId = getCartId();
  return useMutation({
    mutationFn: (productId: number) =>
      cartService.removeCartItem(productId, cartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  const cartId = getCartId();
  return useMutation({
    mutationFn: () => cartService.clearCart(cartId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}
