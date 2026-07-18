"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrders } from "@/hooks/use-orders";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Badge } from "@simplestore/ui";
import { Button } from "@simplestore/ui";
import { Card } from "@simplestore/ui";
import { Skeleton } from "@simplestore/ui";
import StyledLink from "@/components/ui/styled-link";
import { Package, ChevronRight } from "lucide-react";
import { getStatusVariant } from "@/lib/order-utils";

const STATUS_TABS = ["All", "PENDING", "CONFIRMED", "CANCELLED"] as const;

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const [activeTab, setActiveTab] = useState<string>("All");

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (activeTab === "All") return orders;
    return orders.filter((o) => o.status === activeTab);
  }, [orders, activeTab]);

  // ── Auth loading ──
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Auth gate ──
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={Package}
          title="Login Required"
          description="Please log in to view your orders."
          action={{ label: "Go to Login", href: "/account/login" }}
        />
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // ── Empty ──
  if (!orders?.length) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="My Orders" />
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="You haven't placed any orders yet. Start shopping to see your orders here."
          action={{ label: "Start Shopping", href: "/products" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="My Orders"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Account" }, { label: "Orders" }]}
      />

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
        {STATUS_TABS.map((tab) => {
          const count =
            tab === "All"
              ? orders.length
              : orders.filter((o) => o.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab === "All" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order cards (mobile) / table rows (desktop) */}
      {filteredOrders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={`No ${activeTab.toLowerCase()} orders`}
          description={`You don't have any ${activeTab.toLowerCase()} orders.`}
          action={
            activeTab !== "All"
              ? { label: "Show All Orders", href: "" }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {/* Desktop: table */}
          <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Order
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Total
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">#{order.id}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {order.orderDate?.substring(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium tabular-nums">
                      ${order.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
                      >
                        View
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="p-4 hover:translate-y-0">
                <Link href={`/account/orders/${order.id}`} className="block space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">#{order.id}</span>
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {order.orderDate?.substring(0, 10)}
                    </span>
                    <span className="font-semibold tabular-nums">
                      ${order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {order.items?.length ?? 0} item
                      {(order.items?.length ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
