// Re-export shared types with storefront-specific aliases
export type {
  ApiResponse,
  PagedResult,
  Product,
  Category,
  TokenResponse,
  SubscriptionPlan,
  CustomerSubscription,
  Cycle,
} from "@simplestore/shared/types";

export type UserDto = import("@simplestore/shared/types").User;
export type OrderDto = import("@simplestore/shared/types").Order;
export type OrderItemDto = import("@simplestore/shared/types").OrderItem;

// Storefront-specific types
export interface Cart {
  items: CartItem[];
  total: number;
}

export interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface SubscribeRequest {
  planId: number;
  paymentMethodId?: string;
}
