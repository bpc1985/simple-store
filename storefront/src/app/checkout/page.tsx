"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { useCart, useClearCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import StyledLink from "@/components/ui/styled-link";
import EmptyState from "@/components/ui/empty-state";
import { ShoppingCart, ArrowLeft, ArrowRight, Check, Package } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const schema = z.object({
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(3, "Zip code is required"),
});

type FormData = z.infer<typeof schema>;

// Progress steps
const STEPS = ["Shipping", "Review", "Confirmation"] as const;
type Step = (typeof STEPS)[number];

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: cartData, isLoading: cartLoading } = useCart();
  const createOrder = useCreateOrder();
  const clearCart = useClearCart();
  const [step, setStep] = useState<Step>("Shipping");
  const [shipping, setShipping] = useState<FormData | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onShippingSubmit = handleSubmit((data) => {
    setShipping(data);
    setStep("Review");
  });

  const onConfirm = () => {
    if (!cartData?.items?.length || !shipping) {
      toast.error("Your cart is empty");
      return;
    }

    const shippingAddress = `${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zip}`;
    const items = cartData.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
    }));

    createOrder.mutate(
      { shippingAddress, items },
      {
        onSuccess: (data: { id?: number }) => {
          clearCart.mutate(undefined, {
            onError: () => toast.error("Order placed, but cart could not be cleared. Please clear it manually."),
          });
          setConfirmedOrderId(data.id ?? null);
          setStep("Confirmation");
          toast.success("Order placed successfully!");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // ── Auth gate ──
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={Package}
          title="Login Required"
          description="You need to log in before placing an order."
          action={{ label: "Go to Login", href: `/account/login?returnUrl=/checkout` }}
        />
      </div>
    );
  }

  // ── Cart gate ──
  if (cartLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40 mb-6" />
      </div>
    );
  }

  if (!cartData?.items?.length && step !== "Confirmation") {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Add some products before checking out."
          action={{ label: "Browse Products", href: "/products" }}
        />
      </div>
    );
  }

  const itemCount = cartData?.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Progress Indicator ── */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {STEPS.map((s, i) => {
            const currentIdx = STEPS.indexOf(step);
            const isCompleted = i < currentIdx;
            const isCurrent = s === step;
            return (
              <div key={s} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center justify-center size-8 rounded-full text-sm font-semibold transition-colors ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isCompleted ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span
                    className={`text-sm font-medium hidden sm:inline ${
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 ${
                      i < currentIdx ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Step: Shipping ── */}
      {step === "Shipping" && (
        <>
          <h1 className="text-3xl font-semibold mb-6">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={onShippingSubmit} className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold text-lg">Shipping Address</h2>
                  <div>
                    <label htmlFor="address" className="text-sm font-medium">
                      Address
                    </label>
                    <Input
                      id="address"
                      {...register("address")}
                      className="mt-1 h-11"
                      autoComplete="street-address"
                      aria-describedby={errors.address ? "address-error" : undefined}
                    />
                    {errors.address && (
                      <p id="address-error" className="text-xs text-destructive mt-1">
                        {errors.address.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="city" className="text-sm font-medium">
                        City
                      </label>
                      <Input
                        id="city"
                        {...register("city")}
                        className="mt-1 h-11"
                        autoComplete="address-level2"
                        aria-describedby={errors.city ? "city-error" : undefined}
                      />
                      {errors.city && (
                        <p id="city-error" className="text-xs text-destructive mt-1">
                          {errors.city.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="state" className="text-sm font-medium">
                        State
                      </label>
                      <Input
                        id="state"
                        {...register("state")}
                        className="mt-1 h-11"
                        autoComplete="address-level1"
                        aria-describedby={errors.state ? "state-error" : undefined}
                      />
                      {errors.state && (
                        <p id="state-error" className="text-xs text-destructive mt-1">
                          {errors.state.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="zip" className="text-sm font-medium">
                        Zip
                      </label>
                      <Input
                        id="zip"
                        {...register("zip")}
                        className="mt-1 h-11"
                        autoComplete="postal-code"
                        inputMode="numeric"
                        aria-describedby={errors.zip ? "zip-error" : undefined}
                      />
                      {errors.zip && (
                        <p id="zip-error" className="text-xs text-destructive mt-1">
                          {errors.zip.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full">
                Continue to Review
                <ArrowRight className="size-4" />
              </Button>
            </form>

            {/* Sidebar — order summary */}
            <OrderSummary items={cartData!.items} total={cartData!.total} itemCount={itemCount} />
          </div>
        </>
      )}

      {/* ── Step: Review ── */}
      {step === "Review" && shipping && (
        <>
          <h1 className="text-3xl font-semibold mb-6">Review Your Order</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Shipping info */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Shipping to</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep("Shipping")}
                    >
                      Edit
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {shipping.address}
                    <br />
                    {shipping.city}, {shipping.state} {shipping.zip}
                  </p>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardContent className="p-5">
                  <h2 className="font-semibold mb-3">
                    Items ({itemCount})
                  </h2>
                  <div className="space-y-3">
                    {cartData!.items.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center gap-3"
                      >
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ShoppingCart className="size-4 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">
                            {item.productName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="text-sm font-medium tabular-nums shrink-0">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep("Shipping")}
                >
                  <ArrowLeft className="size-4" />
                  Edit Address
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={onConfirm}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending
                    ? "Placing Order..."
                    : `Place Order — $${cartData!.total.toFixed(2)}`}
                </Button>
              </div>
            </div>

            <OrderSummary items={cartData!.items} total={cartData!.total} itemCount={itemCount} />
          </div>
        </>
      )}

      {/* ── Step: Confirmation ── */}
      {step === "Confirmation" && (
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center size-16 rounded-full bg-success/10 mb-6">
            <Check className="size-8 text-success" />
          </div>
          <h1 className="text-3xl font-semibold mb-2">Order Confirmed!</h1>
          <p className="text-muted-foreground mb-2">
            {confirmedOrderId
              ? `Order #${confirmedOrderId} has been placed.`
              : "Your order has been placed."}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            We&apos;ll send updates to your email. Thank you for shopping with us!
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <StyledLink href="/account/orders">
              <Package className="size-4" />
              View My Orders
            </StyledLink>
            <StyledLink href="/products" variant="outline">
              Continue Shopping
            </StyledLink>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable order summary sidebar */
function OrderSummary({
  items,
  total,
  itemCount,
}: {
  items: { productName: string; quantity: number; price: number; imageUrl: string }[];
  total: number;
  itemCount: number;
}) {
  return (
    <div className="lg:sticky lg:top-[88px] lg:self-start">
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold text-lg">Order Summary</h2>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item, i) => (
              <div
                key={`${item.productName}-${i}`}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground truncate max-w-[180px]">
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-medium tabular-nums shrink-0">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-semibold text-lg border-t pt-3">
            <span>Total</span>
            <span className="tabular-nums">${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
