"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrders, useCancelOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Package, XCircle } from "lucide-react";
import { toast } from "sonner";

function statusVariant(status: string) {
  switch (status.toUpperCase()) {
    case "CONFIRMED":
    case "DELIVERED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useOrders();

  const order = orders?.find((o) => String(o.id) === id);
  const cancelOrder = useCancelOrder();

  const handleCancel = () => {
    if (!order || !window.confirm("Are you sure you want to cancel this order?")) return;
    cancelOrder.mutate(order.id, {
      onSuccess: () => toast.success("Order cancelled"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-20 mb-6" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <Link
          href="/account/login"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-8 px-2.5 text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <Package className="size-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order not found</h1>
        <Button variant="ghost" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => router.push("/account/orders")}
      >
        <ArrowLeft className="size-4" />
        Back to Orders
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Order #{order.id}</CardTitle>
            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Placed on {order.orderDate?.substring(0, 10)}
          </p>
          <p className="text-sm text-muted-foreground">
            Shipping to: {order.shippingAddress}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="font-semibold">Items</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, i) => (
                <TableRow key={`${item.productId}-${i}`}>
                  <TableCell className="font-medium">
                    {item.productName}
                  </TableCell>
                  <TableCell className="text-right">
                    ${item.unitPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between pt-2">
            {order.status === "PENDING" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
              >
                <XCircle className="size-4" />
                {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto text-lg font-bold">
              Total:{" "}
              <span className="text-green-600">
                ${order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
