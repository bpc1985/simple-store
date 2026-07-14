"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useProduct } from "@/hooks/use-products";
import { useAddToCart } from "@/hooks/use-cart";
import { useCartContext } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, error } = useProduct(id);
  const addToCart = useAddToCart();
  const { openCart } = useCartContext();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    addToCart.mutate(
      {
        productId: product!.id,
        productName: product!.name,
        price: product!.price,
        imageUrl: product!.imageUrl || "",
        quantity,
      },
      {
        onSuccess: () => {
          toast.success("Added to cart");
          openCart();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Skeleton className="h-5 w-16 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <Skeleton className="aspect-[4/5] rounded-2xl" />
          <div className="space-y-5">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-5xl mx-auto text-center py-24">
        <p className="text-muted-foreground text-lg">Product not found.</p>
        <Button
          variant="link"
          onClick={() => router.push("/products")}
          className="mt-2"
        >
          Back to Products
        </Button>
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div className="max-w-5xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        className="mb-8 group"
        onClick={() => router.back()}
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="aspect-[4/5] bg-muted rounded-2xl overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ShoppingCart className="size-16 text-muted-foreground/20" />
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            {product.categoryName && (
              <p className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground mb-2">
                {product.categoryName}
              </p>
            )}
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
          </div>

          <p className="text-2xl font-medium text-primary">
            ${product.price.toFixed(2)}
          </p>

          <p className="text-muted-foreground leading-relaxed text-[15px]">
            {product.description}
          </p>

          {/* Stock badge */}
          <div className="flex items-center gap-2">
            {inStock ? (
              <Badge
                variant="secondary"
                className="gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle className="size-3" />
                In Stock ({product.stock} available)
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1.5 px-3 py-1">
                <XCircle className="size-3" />
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Add to cart */}
          {inStock && (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              {/* Quantity selector */}
              <div className="flex items-center rounded-full border border-border bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="flex items-center justify-center size-10 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-10 text-center text-sm font-medium tabular-nums select-none">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity(Math.min(product.stock, quantity + 1))
                  }
                  className="flex items-center justify-center size-10 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <Button
                size="lg"
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
                className="rounded-full px-8 flex-[1] sm:flex-none text-base"
              >
                <ShoppingCart className="size-4" />
                {addToCart.isPending ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
