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

  return (
    <Link href={`/products/${product.id}`}>
      <div className="group relative flex flex-col rounded-xl bg-card ring-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
        {/* Image */}
        <div className="aspect-[4/5] bg-muted rounded-xl overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <ShoppingCart className="size-10 text-muted-foreground/20" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-1 pt-3 pb-2 px-1">
          <h3 className="font-[family-name:var(--font-heading)] text-base font-medium leading-snug line-clamp-2 group-hover:text-accent-foreground transition-colors">
            {product.name}
          </h3>
          <p className="text-sm font-medium text-primary">
            ${product.price.toFixed(2)}
          </p>
        </div>

        {/* Add to cart — visible on hover */}
        <div className="absolute bottom-3 right-3 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            className="shadow-lg"
          >
            <ShoppingCart className="size-3.5" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>
    </Link>
  );
}
