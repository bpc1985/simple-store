"use client";

import { useCart, useRemoveCartItem, useUpdateCartItem, useAddToCart } from "@/hooks/use-cart";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StyledLink from "@/components/ui/styled-link";
import QuantitySelector from "@/components/ui/quantity-selector";
import PriceDisplay from "@/components/ui/price-display";
import EmptyState from "@/components/ui/empty-state";
import TrustBadges from "@/components/ui/trust-badges";
import { ShoppingCart, Trash2, ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const { data: cartData, isLoading } = useCart();
  const removeItem = useRemoveCartItem();
  const updateItem = useUpdateCartItem();
  const addToCart = useAddToCart();
  const { isAuthenticated } = useAuth();

  const handleRemove = (
    productId: number,
    productName: string,
    price: number,
    imageUrl: string,
    quantity: number
  ) => {
    removeItem.mutate(productId, {
      onSuccess: () => {
        toast.success("Item removed", {
          action: {
            label: "Undo",
            onClick: () => {
              addToCart.mutate(
                { productId, productName, price, imageUrl, quantity },
                { onError: (err) => toast.error(err.message) }
              );
            },
          },
        });
      },
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

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Empty ──
  if (!cartData?.items?.length) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Start browsing our products."
          action={{ label: "Browse Products", href: "/products" }}
        />
      </div>
    );
  }

  const itemCount = cartData.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">
        Shopping Cart ({itemCount})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Cart Items (cards on mobile, cards on desktop too now) ── */}
        <div className="lg:col-span-2 space-y-3">
          {cartData.items.map((item) => (
            <Card key={item.productId} className="p-4 hover:translate-y-0 hover:shadow-[var(--elevation-1)]">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="h-20 w-20 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ShoppingCart className="size-6 text-muted-foreground/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {item.productName}
                  </p>
                  <div className="mt-1">
                    <PriceDisplay price={item.price} size="sm" />
                  </div>

                  <div className="flex items-center justify-between mt-3 gap-2">
                    <QuantitySelector
                      quantity={item.quantity}
                      onChange={(qty) => handleQuantityChange(item.productId, qty)}
                      size="sm"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          handleRemove(item.productId, item.productName, item.price, item.imageUrl, item.quantity)
                        }
                        className="text-destructive hover:text-destructive/80 shrink-0"
                        aria-label={`Remove ${item.productName}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          <div className="pt-2">
            <StyledLink
              href="/products"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <ArrowRight className="size-4 rotate-180" />
              Continue Shopping
            </StyledLink>
          </div>
        </div>

        {/* ── Order Summary (sticky on desktop) ── */}
        <div className="lg:sticky lg:top-[88px] lg:self-start">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="font-semibold text-lg">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
                  </span>
                  <span className="font-medium tabular-nums">
                    ${cartData.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-muted-foreground">
                    Calculated at next step
                  </span>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="tabular-nums">
                    ${cartData.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax calculated at checkout
                </p>
              </div>

              {isAuthenticated ? (
                <StyledLink href="/checkout" className="w-full">
                  Proceed to Checkout
                  <ArrowRight className="size-4" />
                </StyledLink>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    Please log in to checkout
                  </p>
                  <StyledLink href="/account/login" className="w-full">
                    Login to Checkout
                  </StyledLink>
                </div>
              )}

              {/* Trust badges mini */}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1" role="img" aria-label="Secure checkout">
                    <ShieldCheck className="size-3" />
                    Secure
                  </span>
                  <span className="inline-flex items-center gap-1" role="img" aria-label="Free shipping over $50">
                    <Truck className="size-3" />
                    Free over $50
                  </span>
                  <span className="inline-flex items-center gap-1" role="img" aria-label="Easy returns">
                    <RotateCcw className="size-3" />
                    Easy Returns
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Trust Bar ── */}
      <div className="mt-12">
        <TrustBadges className="rounded-2xl" />
      </div>
    </div>
  );
}
