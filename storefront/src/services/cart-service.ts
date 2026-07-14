import api from "@/lib/api";
import type { Cart } from "@/types";

function cartHeaders(cartId?: string): Record<string, string> {
  return cartId ? { "X-Cart-Id": cartId } : {};
}

export async function getCart(cartId?: string): Promise<Cart> {
  return api.get("/api/v1/cart", { headers: cartHeaders(cartId) });
}

export async function addToCart(
  productId: number,
  productName: string,
  price: number,
  imageUrl: string,
  quantity: number,
  cartId?: string
): Promise<Cart> {
  return api.post("/api/v1/cart/items", { productId, productName, price, imageUrl, quantity }, { headers: cartHeaders(cartId) });
}

export async function updateCartItem(
  productId: number,
  quantity: number,
  cartId?: string
): Promise<Cart> {
  return api.put("/api/v1/cart/items", { productId, quantity }, { headers: cartHeaders(cartId) });
}

export async function removeCartItem(
  productId: number,
  cartId?: string
): Promise<Cart> {
  return api.delete(`/api/v1/cart/items/${productId}`, { headers: cartHeaders(cartId) });
}

export async function clearCart(cartId?: string): Promise<void> {
  return api.delete("/api/v1/cart", { headers: cartHeaders(cartId) });
}
