"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(3, "Zip code is required"),
});

type FormData = z.infer<typeof schema>;

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

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: cartData, isLoading: cartLoading } = useCart();
  const createOrder = useCreateOrder();
  const clearCart = useClearCart();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    if (!cartData?.items?.length) {
      toast.error("Your cart is empty");
      return;
    }

    const shippingAddress = `${data.address}, ${data.city}, ${data.state} ${data.zip}`;
    const items = cartData.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
    }));

    createOrder.mutate(
      { shippingAddress, items },
      {
        onSuccess: () => {
          clearCart.mutate();
          toast.success("Order placed successfully!");
          router.push("/account/orders");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

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
      <div className="max-w-4xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-muted-foreground mb-4">
          You need to log in before placing an order.
        </p>
        <StyledLink href="/account/login">Go to Login</StyledLink>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40 mb-6" />
      </div>
    );
  }

  if (!cartData?.items?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <ShoppingCart className="size-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <StyledLink href="/products">Browse Products</StyledLink>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipping form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-2 space-y-4"
        >
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-semibold text-lg">Shipping Address</h2>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input {...register("address")} className="mt-1" />
                {errors.address && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.address.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input {...register("city")} className="mt-1" />
                  {errors.city && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.city.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">State</label>
                  <Input {...register("state")} className="mt-1" />
                  {errors.state && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.state.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Zip</label>
                  <Input {...register("zip")} className="mt-1" />
                  {errors.zip && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.zip.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={createOrder.isPending}
          >
            {createOrder.isPending ? "Placing Order..." : "Place Order"}
          </Button>
        </form>

        {/* Order summary */}
        <div>
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="font-semibold text-lg">Order Summary</h2>
              {cartData.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.productName} x {item.quantity}
                  </span>
                  <span className="font-medium">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span className="text-green-600">
                  ${cartData.total.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
