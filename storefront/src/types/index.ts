// API response wrapper (matches backend com.simplestore.common.dto.ApiResponse)
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  categoryId: number;
  categoryName: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

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

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  locked: boolean;
}

export interface OrderDto {
  id: number;
  userId: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  shippingAddress: string;
  items: OrderItemDto[];
}

export interface OrderItemDto {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

// ── Subscription ──────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  cadence: string; // "MONTHLY" | "QUARTERLY"
  imageUrl: string;
  active: boolean;
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: string; // "ACTIVE" | "PAUSED" | "CANCELLED" | "PAYMENT_FAILED"
  startDate: string;
  nextBillingDate: string;
  lastBillingDate: string | null;
  currentCycle: number;
}

export interface SubscribeRequest {
  planId: number;
  paymentMethodId?: string;
}

export interface Cycle {
  id: string;
  cycleNumber: number;
  status: string; // "PENDING" | "CHARGED" | "ASSEMBLING" | "SHIPPED" | "FAILED"
  paymentTransactionId: string | null;
  orderId: string | null;
  scheduledDate: string;
  completedDate: string | null;
}
