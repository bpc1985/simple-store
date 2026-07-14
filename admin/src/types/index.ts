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

export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  locked: boolean;
}

export interface StockLevel {
  productId: number;
  stockLevel: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

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
