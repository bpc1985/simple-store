"use client";

import Link from "next/link";
import type { Product } from "@/types";
import { useAddToCart } from "@/hooks/use-cart";
import { useCartContext } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export default function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const { openCart } = useCartContext();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
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

  return (
    <div className="group flex flex-col rounded-xl bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      {/* Image — links to PDP */}
      <Link
        href={`/products/${product.id}`}
        className="aspect-[4/5] bg-muted rounded-xl overflow-hidden relative product-card-image"
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ShoppingCart className="size-10 text-muted-foreground/20" />
          </div>
        )}
      </Link>

      {/* Info + always-visible Add button */}
      <div className="flex flex-col gap-2 pt-3 pb-3 px-2">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-base font-medium leading-snug line-clamp-2 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground tabular-nums">
            ${product.price.toFixed(2)}
          </p>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            className="sm:inline-flex"
          >
            <ShoppingCart className="size-3.5" />
            <span className="hidden sm:inline ml-1">Add</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
