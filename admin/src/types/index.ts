// Re-export shared types
export type {
  ApiResponse,
  PagedResult,
  Product,
  Category,
  TokenResponse,
  User,
  Order,
  OrderItem,
  SubscriptionPlan,
  CustomerSubscription,
  Cycle,
  StockLevel,
  OrderStats,
  CreatePlanRequest,
  UpdatePlanRequest,
} from "@simplestore/shared/types";

// Admin-specific types
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  confirmedOrders: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductSale {
  name: string;
  units: number;
  revenue: number;
}

export interface DashboardData extends DashboardStats {
  revenueByDate: RevenuePoint[];
  topProducts: ProductSale[];
}
