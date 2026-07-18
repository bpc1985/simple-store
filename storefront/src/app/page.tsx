"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useProducts, useCategories } from "@/hooks/use-products";
import ProductGrid from "@/components/products/product-grid";
import ProductSkeleton from "@/components/products/product-skeleton";
import SearchInput from "@/components/ui/search-input";
import SectionHeader from "@/components/ui/section-header";
import TrustBadges from "@/components/ui/trust-badges";
import { ArrowRight, ShoppingBag, Smartphone, Shirt, Home, Dumbbell, BookOpen, LayoutGrid, Box } from "lucide-react";
import { useSubscriptionPlans } from "@/hooks/use-subscriptions";
import PlanCard from "@/components/subscriptions/plan-card";
import type { LucideIcon } from "lucide-react";

// Categories mapped to Lucide icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Electronics: Smartphone,
  Clothing: Shirt,
  "Home & Garden": Home,
  Sports: Dumbbell,
  Books: BookOpen,
};

function getCategoryIcon(name: string): LucideIcon {
  for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return LayoutGrid;
}

// Recently viewed — stored in localStorage
const RECENTLY_VIEWED_KEY = "simplestore_recently_viewed";
function getRecentlyViewed(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: productsData, isLoading } = useProducts(0);
  const { data: categories } = useCategories();
  const { data: plans } = useSubscriptionPlans();
  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    setRecentIds(getRecentlyViewed());
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      if (value) {
        router.push(`/products?search=${encodeURIComponent(value)}`);
      }
    },
    [router]
  );

  const featuredProducts = productsData?.items?.slice(0, 8) ?? [];
  const recentProducts = (productsData?.items ?? []).filter((p) =>
    recentIds.includes(p.id)
  );

  return (
    <div className="space-y-16 max-w-7xl mx-auto">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-6 py-20 sm:px-12 sm:py-32">
        <div className="relative max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl text-balance">
            Quality goods, <br />
            <span className="text-blue-200">fairly priced.</span>
          </h1>
          <p className="mt-5 text-base text-blue-100 leading-relaxed max-w-md mx-auto">
            Discover products crafted with care. Free shipping on orders over
            $50.
          </p>

          {/* Search bar in hero */}
          <div className="mt-8 max-w-md mx-auto">
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Search products..."
              className="[&_input]:bg-white/15 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-blue-200 [&_svg]:text-blue-200"
            />
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-700 px-6 py-3 text-sm font-semibold hover:bg-blue-50 transition-colors shadow-lg shadow-black/10"
            >
              Shop All
              <ArrowRight className="size-4" />
            </Link>
            {categories?.slice(0, 3).map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 text-white px-5 py-3 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section>
        <SectionHeader title="Featured Products" viewAllHref="/products" />

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : featuredProducts.length > 0 ? (
          <ProductGrid products={featuredProducts} />
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-2xl">
            <ShoppingBag className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No products available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check back soon for new arrivals.
            </p>
          </div>
        )}
      </section>

      {/* ── Shop by Category ── */}
      {categories && categories.length > 0 && (
        <section>
          <SectionHeader title="Shop by Category" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-primary/20"
              >
                {(() => {
                  const CatIcon = getCategoryIcon(cat.name);
                  return <CatIcon className="size-8 sm:size-10 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />;
                })()}
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Subscription Boxes ── */}
      {plans && plans.length > 0 && (
        <section>
          <SectionHeader
            title="Subscription Boxes"
            viewAllHref="/subscriptions"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.slice(0, 3).map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>
      )}

      {/* ── Recently Viewed ── */}
      {recentProducts.length > 0 && (
        <section>
          <SectionHeader title="Recently Viewed" viewAllHref="/products" />

          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-6 sm:overflow-visible sm:pb-0 sm:px-0">
            {recentProducts.slice(0, 4).map((product) => (
              <div key={product.id} className="min-w-[70vw] sm:min-w-0 snap-start">
                <Link
                  href={`/products/${product.id}`}
                  className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-[4/5] bg-muted flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <ShoppingBag className="size-10 text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-1">
                      {product.name}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Trust Bar ── */}
      <TrustBadges className="rounded-2xl" />
    </div>
  );
}
