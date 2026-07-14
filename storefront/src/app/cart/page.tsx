"use client";

import Link from "next/link";
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/use-cart";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const { data: cartData, isLoading } = useCart();
  const removeItem = useRemoveCartItem();
  const updateItem = useUpdateCartItem();
  const { isAuthenticated } = useAuth();

  const handleRemove = (productId: number) => {
    removeItem.mutate(productId, {
      onSuccess: () => toast.success("Item removed"),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    updateItem.mutate(
      { productId, quantity },
      { onError: (err) => toast.error(err.message) }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!cartData?.items?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <ShoppingCart className="size-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-4">
          Looks like you haven&apos;t added anything yet.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground h-8 px-2.5 text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-24">Quantity</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cartData.items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-medium">
                    {item.productName}
                  </TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleQuantityChange(
                          item.productId,
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="h-8 w-16 text-center"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(item.productId)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-semibold text-lg">Order Summary</h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Items ({cartData.items.reduce((s, i) => s + i.quantity, 0)})
                </span>
                <span>${cartData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-green-600">
                  ${cartData.total.toFixed(2)}
                </span>
              </div>
              {isAuthenticated ? (
                <Link
                  href="/checkout"
                  className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-primary text-primary-foreground h-8 px-2.5 text-sm font-medium hover:bg-primary/80 transition-colors"
                >
                  Proceed to Checkout
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Please log in to checkout
                  </p>
                  <Link
                    href="/account/login"
                    className="inline-flex items-center justify-center w-full rounded-lg bg-primary text-primary-foreground h-8 px-2.5 text-sm font-medium hover:bg-primary/80 transition-colors"
                  >
                    Login to Checkout
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
