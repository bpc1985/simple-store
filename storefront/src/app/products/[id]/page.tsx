"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useProduct, useProducts } from "@/hooks/use-products";
import { useAddToCart } from "@/hooks/use-cart";
import { useCartContext } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import QuantitySelector from "@/components/ui/quantity-selector";
import PriceDisplay from "@/components/ui/price-display";
import StockBadge from "@/components/ui/stock-badge";
import ProductGrid from "@/components/products/product-grid";
import {
  ShoppingCart,
  Check,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const RECENTLY_VIEWED_KEY = "simplestore_recently_viewed";

function addToRecentlyViewed(productId: number) {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const ids: number[] = raw ? JSON.parse(raw) : [];
    const filtered = ids.filter((id) => id !== productId);
    filtered.unshift(productId);
    localStorage.setItem(
      RECENTLY_VIEWED_KEY,
      JSON.stringify(filtered.slice(0, 10))
    );
  } catch {
    // localStorage not available — no-op
  }
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, error } = useProduct(id);
  const addToCart = useAddToCart();
  const { openCart } = useCartContext();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Track recently viewed
  useEffect(() => {
    if (product?.id) addToRecentlyViewed(product.id);
  }, [product?.id]);

  // Reset add confirmation when product changes
  useEffect(() => {
    setAddedToCart(false);
    setQuantity(1);
  }, [id]);

  // Related products — same category
  const { data: relatedData } = useProducts(
    0,
    product?.categoryId ? String(product.categoryId) : undefined
  );
  const relatedProducts = (relatedData?.items ?? []).filter(
    (p) => p.id !== product?.id
  );

  const handleAddToCart = () => {
    if (!product) return;
    addToCart.mutate(
      {
        productId: product.id,
        productName: product.name,
        price: product.price,
        imageUrl: product.imageUrl || "",
        quantity,
      },
      {
        onSuccess: () => {
          setAddedToCart(true);
          toast.success("Added to cart");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Skeleton className="h-5 w-32 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <Skeleton className="aspect-[4/5] rounded-2xl" />
          <div className="space-y-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ──
  if (error || !product) {
    return (
      <div className="max-w-5xl mx-auto text-center py-24">
        <ShoppingCart className="size-16 text-muted-foreground/20 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Product not found</h1>
        <p className="text-muted-foreground mb-6">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button onClick={() => router.push("/products")}>
          Browse Products
        </Button>
      </div>
    );
  }

  const inStock = product.stock > 0;

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Breadcrumbs ── */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/products"
              className="hover:text-foreground transition-colors"
            >
              Products
            </Link>
          </li>
          {product.categoryName && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/products?category=${product.categoryId}`}
                  className="hover:text-foreground transition-colors"
                >
                  {product.categoryName}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="text-foreground font-medium truncate max-w-[200px]">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Product Image ── */}
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

        {/* ── Product Info ── */}
        <div className="flex flex-col">
          {product.categoryName && (
            <Link
              href={`/products?category=${product.categoryId}`}
              className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              {product.categoryName}
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl text-balance">
            {product.name}
          </h1>

          <div className="mt-4">
            <PriceDisplay price={product.price} size="lg" />
          </div>

          <div className="mt-4">
            <StockBadge stock={product.stock} />
          </div>

          <p className="mt-6 text-muted-foreground leading-relaxed text-base">
            {product.description}
          </p>

          {/* ── Add to Cart (desktop) ── */}
          {inStock && (
            <div className="hidden sm:flex flex-col gap-3 pt-6 mt-6 border-t border-border">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Quantity</label>
                <QuantitySelector
                  quantity={quantity}
                  onChange={setQuantity}
                  max={product.stock}
                />
              </div>

              {addedToCart ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    size="lg"
                    className="rounded-full px-8 gap-2 bg-success hover:bg-success/90"
                    disabled
                  >
                    <Check className="size-4" />
                    Added to Cart
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-6"
                    onClick={openCart}
                  >
                    View Cart
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="rounded-full px-6"
                    onClick={() => setAddedToCart(false)}
                  >
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                  className="rounded-full px-8 sm:w-auto text-base"
                >
                  <ShoppingCart className="size-5" />
                  {addToCart.isPending ? "Adding..." : "Add to Cart"}
                </Button>
              )}
            </div>
          )}

          {/* ── Collapsible Info ── */}
          <div className="mt-8 border-t border-border pt-6 space-y-1">
            <details className="group" open>
              <summary className="flex items-center justify-between py-3 cursor-pointer list-none">
                <span className="text-sm font-semibold">Description</span>
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
              </summary>
              <p className="text-sm text-muted-foreground pb-3">
                {product.description}
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between py-3 cursor-pointer list-none">
                <span className="text-sm font-semibold">
                  Shipping &amp; Returns
                </span>
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
              </summary>
              <div className="text-sm text-muted-foreground pb-3 space-y-1">
                <p>Free shipping on orders over $50.</p>
                <p>Standard delivery: 3-5 business days.</p>
                <p>30-day return policy. Free return shipping.</p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight mb-6">
            You Might Also Like
          </h2>
          <ProductGrid products={relatedProducts.slice(0, 4)} />
        </section>
      )}

      {/* ── Sticky Add to Cart Bar (mobile) ── */}
      {inStock && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-4 py-3 safe-area-bottom">
          {addedToCart ? (
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 rounded-full gap-2 bg-success hover:bg-success/90"
                disabled
              >
                <Check className="size-4" />
                Added
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                size="sm"
                onClick={openCart}
              >
                View Cart
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <QuantitySelector
                quantity={quantity}
                onChange={setQuantity}
                max={product.stock}
                size="sm"
              />
              <Button
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
                className="flex-1 rounded-full text-base"
                size="lg"
              >
                <ShoppingCart className="size-4" />
                {addToCart.isPending
                  ? "Adding..."
                  : `Add to Cart — $${(product.price * quantity).toFixed(2)}`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Spacer for sticky bar on mobile */}
      <div className="sm:hidden h-20" />
    </div>
  );
}
