"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { useAddToCart } from "@/hooks/use-cart";
import { useCartContext } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import StockBadge from "@/components/ui/stock-badge";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const { openCart } = useCartContext();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      {
        productId: product.id,
        productName: product.name,
        price: product.price,
        imageUrl: product.imageUrl || "",
        quantity: 1,
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

  const isOutOfStock = product.stock <= 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col rounded-xl bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40"
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/5] bg-muted rounded-xl overflow-hidden product-card-image">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ShoppingCart className="size-12 text-muted-foreground/15" />
          </div>
        )}

        {/* Category eyebrow */}
        {product.categoryName && (
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
            {product.categoryName}
          </span>
        )}

        {/* Stock badge */}
        <div className="absolute top-3 right-3">
          <StockBadge
            stock={product.stock}
            className="bg-background/90 backdrop-blur-sm shadow-sm"
          />
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-col gap-1.5 px-1 pt-3.5 pb-3">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground transition-colors group-hover:text-primary/80">
          {product.name}
        </h3>

        <div className="flex items-end justify-between gap-2 mt-1">
          <p
            className="text-lg font-bold text-foreground tabular-nums leading-none"
            data-slot="price"
          >
            ${product.price.toFixed(2)}
          </p>

          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={addToCart.isPending || isOutOfStock}
            variant={isOutOfStock ? "secondary" : "default"}
            className="shrink-0 text-xs h-8"
          >
            <ShoppingCart className="size-3.5" />
            <span className="ml-1.5">
              {isOutOfStock ? "Sold Out" : "Add"}
            </span>
          </Button>
        </div>
      </div>
    </Link>
  );
}
