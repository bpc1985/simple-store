"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useOrders, useCancelOrder } from "@/hooks/use-orders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, XCircle } from "lucide-react";
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

function StyledLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-8 px-2.5 text-sm font-medium hover:bg-primary/80 transition-colors"
    >
      {children}
    </Link>
  );
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const cancelOrder = useCancelOrder();

  const handleCancel = (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    cancelOrder.mutate(id, {
      onSuccess: () => toast.success("Order cancelled"),
      onError: err => toast.error(err.message),
    });
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-muted-foreground mb-4">
          Please log in to view your orders.
        </p>
        <StyledLink href="/account/login">Go to Login</StyledLink>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 mb-6" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <Package className="size-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">No orders yet</h1>
        <p className="text-muted-foreground mb-4">
          You haven&apos;t placed any orders yet.
        </p>
        <StyledLink href="/products">Start Shopping</StyledLink>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right w-6"></TableHead>
            <TableHead className="text-right w-6"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map(order => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.id}</TableCell>
              <TableCell>{order.orderDate?.substring(0, 10)}</TableCell>
              <TableCell className="font-medium">
                ${order.totalAmount.toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center justify-center rounded-md h-7 px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground transition-colors"
                  >
                    View
                  </Link>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {order.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancel(order.id)}
                    >
                      <XCircle className="size-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
