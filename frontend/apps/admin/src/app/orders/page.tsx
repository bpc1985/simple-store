"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrders } from "@/hooks/use-orders";
import { Alert, AlertDescription, AlertTitle } from "@simplestore/ui";
import { Badge } from "@simplestore/ui";
import { Button } from "@simplestore/ui";
import { Skeleton } from "@simplestore/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@simplestore/ui";
import { ChevronLeft, ChevronRight, Eye, ShoppingBag } from "lucide-react";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  SHIPPED: "outline",
  CANCELLED: "destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toISOString().substring(0, 10);
}

export default function OrdersPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, error } = useOrders(page);
  const totalPages = data
    ? Math.ceil(data.totalCount / (data.pageSize || 10))
    : 0;

  if (isError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load orders"}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Orders
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {data ? `${data.totalCount} orders` : "Loading..."}
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead className="w-24">User</TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-16">View</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingBag className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No orders found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    #{o.id}
                  </TableCell>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    {o.userId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(o.orderDate)}
                  </TableCell>
                  <TableCell className="font-mono text-right tabular-nums text-sm font-medium">
                    ${o.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[o.status] ?? "secondary"}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/orders/${o.id}`}>
                      <Button variant="ghost" size="icon-xs">
                        <Eye className="size-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
