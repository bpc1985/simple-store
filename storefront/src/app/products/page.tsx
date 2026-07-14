"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useProducts, useCategories } from "@/hooks/use-products";
import ProductGrid from "@/components/products/product-grid";
import ProductSkeleton from "@/components/products/product-skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = parseInt(searchParams.get("page") || "0");
  const categoryId = searchParams.get("category") || undefined;
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const { data: productsData, isLoading } = useProducts(
    page,
    categoryId,
    searchParams.get("search") || undefined
  );
  const { data: categories } = useCategories();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId) params.set("category", categoryId);
      router.push(`/products?${params.toString()}`);
    },
    [search, categoryId, router]
  );

  const navigate = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/products?${params.toString()}`);
  };

  const totalPages = productsData
    ? Math.ceil(productsData.totalCount / productsData.pageSize)
    : 0;

  return (
    <div className="space-y-8">
      {/* Top bar: title + search + categories */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
            All Products
          </h1>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-full border-muted bg-white focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </form>
        </div>

        {/* Category pills */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <LinkPill active={!categoryId} href="/products">
              All
            </LinkPill>
            {categories.map((cat) => (
              <LinkPill
                key={cat.id}
                active={categoryId === String(cat.id)}
                href={`/products?category=${cat.id}${search ? `&search=${search}` : ""}`}
              >
                {cat.name}
              </LinkPill>
            ))}
          </div>
        )}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : productsData?.items && productsData.items.length > 0 ? (
        <>
          <ProductGrid products={productsData.items} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onClick={() => navigate(page - 1)}
                className="rounded-full"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={i === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate(i)}
                  className={i === page ? "rounded-full" : "rounded-full"}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => navigate(page + 1)}
                className="rounded-full"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No products found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}

function LinkPill({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  const cn = active
    ? "inline-flex items-center rounded-full px-5 py-2 text-sm font-medium bg-primary text-primary-foreground transition-all"
    : "inline-flex items-center rounded-full px-5 py-2 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all";
  return (
    <a href={href} className={cn}>
      {children}
    </a>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
