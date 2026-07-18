"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useOrder, useCancelOrder } from "@/hooks/use-orders";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { Button } from "@simplestore/ui";
import { Badge } from "@simplestore/ui";
import { Card, CardContent } from "@simplestore/ui";
import { Skeleton } from "@simplestore/ui";
import {
  Package,
  XCircle,
  Check,
  Clock,
  Truck,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getStatusVariant } from "@/lib/order-utils";

// Status timeline steps
const STATUS_FLOW = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;
const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  CONFIRMED: Check,
  SHIPPED: Truck,
  DELIVERED: PackageCheck,
  CANCELLED: XCircle,
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: order, isLoading } = useOrder(id);
  const [confirming, setConfirming] = useState(false);
  const cancelOrder = useCancelOrder();

  const handleCancel = () => {
    if (!order) return;
    cancelOrder.mutate(order.id, {
      onSuccess: () => {
        toast.success("Order cancelled");
        setConfirming(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  // ── Loading ──
  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-20 mb-6" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
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
          description="Please log in to view order details."
          action={{ label: "Go to Login", href: "/account/login" }}
        />
      </div>
    );
  }

  // ── Not found ──
  if (!order) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={Package}
          title="Order not found"
          description="This order doesn't exist or has been removed."
          action={{ label: "Back to Orders", href: "/account/orders" }}
        />
      </div>
    );
  }

  const isCancelled = order.status === "CANCELLED";
  const currentStepIdx = isCancelled
    ? -1
    : STATUS_FLOW.indexOf(order.status as never);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title={`Order #${order.id}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Account" },
          { label: "Orders", href: "/account/orders" },
          { label: `#${order.id}` },
        ]}
      />

      <div className="space-y-6">
        {/* ── Status Timeline ── */}
        {!isCancelled && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between max-w-xl mx-auto">
                {STATUS_FLOW.map((s, i) => {
                  const Icon = STATUS_ICONS[s];
                  const isCompleted = i <= currentStepIdx;
                  const isCurrent = i === currentStepIdx;
                  return (
                    <div key={s} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`flex items-center justify-center size-10 rounded-full transition-colors ${
                            isCompleted
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <span
                          className={`text-xs mt-1.5 ${
                            isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-2 ${
                            i < currentStepIdx ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex items-center gap-3">
            <XCircle className="size-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Order Cancelled</p>
              <p className="text-xs text-destructive/70">
                This order was cancelled and will not be processed.
              </p>
            </div>
          </div>
        )}

        {/* Order info + items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {/* Items */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-3">
                  Items ({order.items?.length ?? 0})
                </h3>
                <div className="divide-y divide-border">
                  {order.items.map((item, i) => (
                    <div
                      key={`${item.productId}-${i}`}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          ${item.unitPrice.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping info */}
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold mb-2">Shipping Address</h3>
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="md:sticky md:top-[88px] md:self-start space-y-4">
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={getStatusVariant(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm font-medium">
                    {order.orderDate?.substring(0, 10)}
                  </span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg tabular-nums">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {order.status === "PENDING" && (
              <Card>
                <CardContent className="p-4">
                  {confirming ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground text-center">
                        Cancel this order?
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={handleCancel}
                          disabled={cancelOrder.isPending}
                        >
                          <Check className="size-3.5" />
                          {cancelOrder.isPending ? "Cancelling..." : "Yes, cancel"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setConfirming(false)}
                        >
                          Keep order
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => setConfirming(true)}
                    >
                      <XCircle className="size-4" />
                      Cancel Order
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
