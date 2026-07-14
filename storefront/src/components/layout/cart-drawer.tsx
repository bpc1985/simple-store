"use client";

import Link from "next/link";
import { useCartContext } from "@/lib/cart-context";
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/hooks/use-cart";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function StyledLink({
  href,
  variant = "default",
  children,
  onClick,
}: {
  href: string;
  variant?: "default" | "outline";
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors h-8 px-2.5";
  const styles =
    variant === "outline"
      ? "border border-border bg-background hover:bg-muted"
      : "bg-primary text-primary-foreground hover:bg-primary/80";
  return (
    <Link href={href} className={cn(base, styles, "flex-1")} onClick={onClick}>
      {children}
    </Link>
  );
}

export default function CartDrawer() {
  const { cartOpen, closeCart, setItemCount } = useCartContext();
  const { data: cartData, isLoading } = useCart();
  const removeItem = useRemoveCartItem();
  const updateItem = useUpdateCartItem();

  useEffect(() => {
    if (cartData?.items) {
      setItemCount(
        cartData.items.reduce((sum, item) => sum + item.quantity, 0),
      );
    }
  }, [cartData, setItemCount]);

  const handleRemove = (productId: number) => {
    removeItem.mutate(productId, {
      onSuccess: () => toast.success("Item removed"),
      onError: err => toast.error(err.message),
    });
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    updateItem.mutate(
      { productId, quantity },
      {
        onError: err => toast.error(err.message),
      },
    );
  };

  return (
    <Sheet open={cartOpen} onOpenChange={open => !open && closeCart()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            Cart ({cartData?.items?.length || 0})
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : !cartData?.items?.length ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <ShoppingCart className="size-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Your cart is empty</p>
            <StyledLink href="/products" variant="outline" onClick={closeCart}>
              Browse Products
            </StyledLink>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3">
              {cartData.items.map(item => (
                <div
                  key={item.productId}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="h-14 w-14 shrink-0 rounded-md bg-muted flex items-center justify-center">
                    <ShoppingCart className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.productName}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      ${item.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e =>
                          handleQuantityChange(
                            item.productId,
                            parseInt(e.target.value) || 1,
                          )
                        }
                        className="h-7 w-16 text-xs text-center"
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemove(item.productId)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold text-green-600">
                ${cartData.total.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              <StyledLink href="/cart" variant="outline" onClick={closeCart}>
                View Cart
              </StyledLink>
              <StyledLink href="/checkout" onClick={closeCart}>
                Checkout
              </StyledLink>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
