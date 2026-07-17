"use client";

import { useState, useEffect } from "react";
import { useProducts } from "@/hooks/use-products";
import ProductCard from "@/components/products/product-card";
import ProductSkeleton from "@/components/products/product-skeleton";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import SectionHeader from "@/components/ui/section-header";
import { Heart } from "lucide-react";

const WISHLIST_KEY = "simplestore_wishlist";

function getWishlistIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<number[]>([]);
  const { data: productsData, isLoading } = useProducts(0);

  useEffect(() => {
    setWishlistIds(getWishlistIds());
    // Listen for storage changes
    const onStorage = () => setWishlistIds(getWishlistIds());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Filter all products to find wishlist items
  const wishlistProducts = (productsData?.items ?? []).filter((p) =>
    wishlistIds.includes(p.id)
  );

  // Also get products from categories if not in the first page
  const allProducts = productsData?.items ?? [];

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="My Wishlist"
        description={`${wishlistIds.length} item${wishlistIds.length !== 1 ? "s" : ""} saved`}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Account", href: "/account" }, { label: "Wishlist" }]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : wishlistProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save items you love by clicking the heart icon on any product. They'll appear here for easy access later."
          action={{ label: "Browse Products", href: "/products" }}
        />
      )}
    </div>
  );
}
