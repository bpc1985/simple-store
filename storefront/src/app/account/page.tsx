"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrders } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import PageHeader from "@/components/ui/page-header";
import {
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import { useLogout } from "@/hooks/use-auth";
import { getStatusVariant } from "@/lib/order-utils";

const QUICK_LINKS = [
  { icon: Package, label: "My Orders", href: "/account/orders", enabled: true },
  { icon: Heart, label: "Wishlist", href: "/wishlist", enabled: true },
  { icon: MapPin, label: "Addresses", href: "/account", enabled: false },
  { icon: Settings, label: "Settings", href: "/account", enabled: false },
];

export default function AccountPage() {
  const { isAuthenticated, isLoading: authLoading, user, logout: clearAuth } = useAuth();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => clearAuth(),
    });
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={User}
          title="Login Required"
          description="Please log in to view your account."
          action={{ label: "Go to Login", href: "/account/login" }}
        />
      </div>
    );
  }

  const recentOrders = orders?.slice(0, 3) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader title="My Account" />

      {/* Profile Card */}
      <Card>
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary">
            <User className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-lg truncate">
              {user?.fullName || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button variant="outline" size="sm" disabled>
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          const card = (
            <div
              className={`flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 transition-all ${
                link.enabled
                  ? "hover:-translate-y-1 hover:shadow-md hover:border-primary/20 cursor-pointer"
                  : "opacity-50 cursor-not-allowed"
              }`}
            >
              <Icon className="size-6 text-primary" />
              <span className="text-sm font-medium">
                {link.label}
                {!link.enabled && (
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Coming soon
                  </span>
                )}
              </span>
            </div>
          );
          return link.enabled ? (
            <Link key={link.label} href={link.href}>
              {card}
            </Link>
          ) : (
            <span key={link.label}>{card}</span>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <Link
            href="/account/orders"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All
            <ChevronRight className="inline-block size-3.5 ml-0.5" />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.id}`}>
                <Card className="p-4 hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono">#{order.id}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.orderDate?.substring(0, 10)} ·{" "}
                        {order.items?.length ?? 0} items
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        ${order.totalAmount.toFixed(2)}
                      </span>
                      <Badge variant={getStatusVariant(order.status)}>
                        {order.status}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No orders yet.{" "}
            <Link href="/products" className="text-primary hover:underline">
              Start shopping
            </Link>
          </p>
        )}
      </div>

      {/* Logout */}
      <div className="border-t border-border pt-6">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
