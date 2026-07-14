"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@/types";
import * as orderService from "@/services/order-service";

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

export function useDashboardStats() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [orders] = await Promise.all([orderService.getOrders(0)]);

      const totalRevenue = orders.items.reduce((sum, o) => sum + o.totalAmount, 0);
      const pendingOrders = orders.items.filter((o) => o.status === "PENDING").length;
      const confirmedOrders = orders.items.filter((o) => o.status === "CONFIRMED").length;

      // Revenue by date (grouped, sorted)
      const dateMap = new Map<string, { revenue: number; orders: number }>();
      for (const o of orders.items) {
        const d = o.orderDate.substring(0, 10);
        const entry = dateMap.get(d) ?? { revenue: 0, orders: 0 };
        entry.revenue += o.totalAmount;
        entry.orders += 1;
        dateMap.set(d, entry);
      }
      const revenueByDate: RevenuePoint[] = Array.from(dateMap.entries())
        .map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top products by units sold
      const productMap = new Map<string, { units: number; revenue: number }>();
      for (const o of orders.items) {
        for (const item of o.items ?? []) {
          const name = item.productName || `Product #${item.productId}`;
          const entry = productMap.get(name) ?? { units: 0, revenue: 0 };
          entry.units += item.quantity;
          entry.revenue += item.quantity * item.unitPrice;
          productMap.set(name, entry);
        }
      }
      const topProducts: ProductSale[] = Array.from(productMap.entries())
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      return {
        totalOrders: orders.totalCount,
        totalRevenue,
        pendingOrders,
        confirmedOrders,
        revenueByDate,
        topProducts,
      };
    },
  });
}
