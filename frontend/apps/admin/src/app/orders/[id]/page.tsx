"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useOrder, useUpdateOrderStatus } from "@/hooks/use-orders";
import { Button } from "@simplestore/ui";
import { Badge } from "@simplestore/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@simplestore/ui";
import { Skeleton } from "@simplestore/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@simplestore/ui";
import { ArrowLeft, Loader2, Package, ReceiptText, RefreshCw } from "lucide-react";

const statuses = ["PENDING", "CONFIRMED", "SHIPPED", "CANCELLED"];

const statusVariants: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  SHIPPED: "outline",
  CANCELLED: "destructive",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const { data: order, isLoading, refetch } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const [newStatus, setNewStatus] = useState("");

  const handleUpdateStatus = () => {
    if (!newStatus || !order || newStatus === order.status) return;
    updateStatus.mutate(
      { id: order.id, status: newStatus },
      {
        onSuccess: () => {
          refetch();
          setNewStatus("");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Package className="size-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Link href="/orders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl">
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Orders
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Order #{order.id}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {new Date(order.orderDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Order info card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ReceiptText className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Order Information</h2>
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">User ID</dt>
              <dd className="font-mono text-sm tabular-nums font-medium">{order.userId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Total</dt>
              <dd className="text-sm font-semibold tabular-nums">${order.totalAmount.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={statusVariants[order.status] ?? "secondary"}>
                  {order.status}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Shipping</dt>
              <dd className="text-sm text-right max-w-[60%] text-foreground">
                {order.shippingAddress}
              </dd>
            </div>
          </dl>
        </div>

        {/* Update status card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Update Status</h2>
          </div>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? "")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s} disabled={s === order.status}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpdateStatus}
              disabled={!newStatus || newStatus === order.status || updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <><Loader2 className="size-4 animate-spin" /> Updating...</>
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items?.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                <TableCell className="font-mono text-right tabular-nums text-sm">{item.quantity}</TableCell>
                <TableCell className="font-mono text-right tabular-nums text-sm text-muted-foreground">
                  ${item.unitPrice.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-right tabular-nums text-sm font-medium">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
            {(!order.items || order.items.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <p className="text-sm text-muted-foreground">No items in this order.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
