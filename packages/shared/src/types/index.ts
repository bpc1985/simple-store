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

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  locked: boolean;
}

export interface Order {
  id: number;
  userId: string;
  orderDate: string;
  totalAmount: number;
  status: string;
  shippingAddress: string;
  items: OrderItem[];
}

export interface OrderItem {
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
  cadence: "MONTHLY" | "QUARTERLY";
  imageUrl: string;
  active: boolean;
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: "ACTIVE" | "PAUSED" | "CANCELLED" | "PAYMENT_FAILED";
  startDate: string;
  nextBillingDate: string;
  lastBillingDate: string | null;
  currentCycle: number;
}

export interface Cycle {
  id: string;
  cycleNumber: number;
  status: string;
  paymentTransactionId: string | null;
  orderId: string | null;
  scheduledDate: string;
  completedDate: string | null;
}

// ── Admin-specific ─────────────────────────────────────────────────────

export interface StockLevel {
  productId: number;
  stockLevel: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  price: number;
  cadence: string;
  imageUrl: string;
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: number;
  cadence?: string;
  imageUrl?: string;
  active?: boolean;
}
