"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProducts, useCategories } from "@/hooks/use-products";
import ProductGrid from "@/components/products/product-grid";
import ProductSkeleton from "@/components/products/product-skeleton";
import FilterPanel, { type ActiveFilters } from "@/components/products/filter-panel";
import SearchInput from "@/components/ui/search-input";
import SortDropdown from "@/components/ui/sort-dropdown";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = parseInt(searchParams.get("page") || "0");
  const categoryId = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "";

  // Filters from URL
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    categoryId,
    inStockOnly: searchParams.get("inStock") === "true",
    minPrice: searchParams.get("minPrice")
      ? parseFloat(searchParams.get("minPrice")!)
      : undefined,
    maxPrice: searchParams.get("maxPrice")
      ? parseFloat(searchParams.get("maxPrice")!)
      : undefined,
  });
  const [searchValue, setSearchValue] = useState(search || "");

  const { data: productsData, isLoading } = useProducts(
    page,
    activeFilters.categoryId || categoryId,
    search
  );
  const { data: categories } = useCategories();

  // Build URL params helper
  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const merged = {
        search: search || undefined,
        category: categoryId,
        sort: sort || undefined,
        page: "0",
        inStock: activeFilters.inStockOnly ? "true" : undefined,
        minPrice: activeFilters.minPrice?.toString(),
        maxPrice: activeFilters.maxPrice?.toString(),
        ...overrides,
      };
      Object.entries(merged).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      return `/products?${params.toString()}`;
    },
    [search, categoryId, sort, activeFilters]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      router.push(buildUrl({ search: value || undefined, page: "0" }));
    },
    [router, buildUrl]
  );

  const handleSort = useCallback(
    (value: string) => {
      router.push(buildUrl({ sort: value || undefined }));
    },
    [router, buildUrl]
  );

  const handleFilterChange = useCallback(
    (filters: ActiveFilters) => {
      setActiveFilters(filters);
      router.push(
        buildUrl({
          category: filters.categoryId,
          inStock: filters.inStockOnly ? "true" : undefined,
          minPrice: filters.minPrice?.toString(),
          maxPrice: filters.maxPrice?.toString(),
          page: "0",
        })
      );
    },
    [router, buildUrl]
  );

  const handleClearFilters = useCallback(() => {
    const empty: ActiveFilters = {
      categoryId: undefined,
      inStockOnly: false,
      minPrice: undefined,
      maxPrice: undefined,
    };
    setActiveFilters(empty);
    setSearchValue("");
    router.push("/products");
  }, [router]);

  const handleLoadMore = useCallback(() => {
    router.push(buildUrl({ page: String(page + 1) }));
  }, [router, page, buildUrl]);

  const totalPages = productsData
    ? Math.ceil(productsData.totalCount / productsData.pageSize)
    : 0;
  const hasMore = page < totalPages - 1;
  const totalCount = productsData?.totalCount ?? 0;
  const resultCount = productsData?.items?.length ?? 0;

  // Active filter chips
  const filterChips: { label: string; onRemove: () => void }[] = [];
  if (activeFilters.categoryId) {
    const cat = categories?.find(
      (c) => String(c.id) === activeFilters.categoryId
    );
    filterChips.push({
      label: cat?.name ?? `Category: ${activeFilters.categoryId}`,
      onRemove: () =>
        handleFilterChange({ ...activeFilters, categoryId: undefined }),
    });
  }
  if (activeFilters.inStockOnly) {
    filterChips.push({
      label: "In Stock",
      onRemove: () =>
        handleFilterChange({ ...activeFilters, inStockOnly: false }),
    });
  }
  if (activeFilters.minPrice !== undefined) {
    filterChips.push({
      label: `Min $${activeFilters.minPrice}`,
      onRemove: () =>
        handleFilterChange({ ...activeFilters, minPrice: undefined }),
    });
  }
  if (activeFilters.maxPrice !== undefined) {
    filterChips.push({
      label: `Max $${activeFilters.maxPrice}`,
      onRemove: () =>
        handleFilterChange({ ...activeFilters, maxPrice: undefined }),
    });
  }
  const hasActiveFilters = filterChips.length > 0 || !!search;

  return (
    <div className="space-y-6">
      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-[72px] z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border space-y-3">
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchValue}
            onChange={handleSearch}
            placeholder="Search products..."
            className="flex-1 max-w-sm"
            inputClassName="h-10"
          />
          <FilterPanel
            categories={categories ?? []}
            activeFilters={activeFilters}
            onChange={handleFilterChange}
            onClear={handleClearFilters}
          />
          <SortDropdown value={sort} onChange={handleSort} />
        </div>

        {/* Result count + filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isLoading && (
            <span className="text-sm text-muted-foreground mr-2">
              {totalCount > 0
                ? `Showing ${resultCount} of ${totalCount} products`
                : "No products found"}
            </span>
          )}
          {filterChips.map((chip) => (
            <button
              key={chip.label}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 hover:bg-primary/20 transition-colors"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Product Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : productsData?.items && productsData.items.length > 0 ? (
        <>
          <ProductGrid products={productsData.items} />

          {/* Load More + Page indicator */}
          <div className="flex flex-col items-center gap-3 pt-2 pb-8">
            {hasMore ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                className="rounded-full px-8 min-w-[160px]"
              >
                Show More
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                You&apos;ve reached the end
              </p>
            )}
            {totalPages > 1 && (
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <Search className="size-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {search
              ? `No results for "${search}". Try a different search term or browse categories.`
              : "Try adjusting your filters or check back later for new products."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="size-4" />
                Clear Filters
              </Button>
            )}
            <Button variant="default" onClick={() => router.push("/products")}>
              Browse All Products
            </Button>
          </div>

          {/* Category suggestions */}
          {categories && categories.length > 0 && (
            <div className="mt-8">
              <p className="text-sm text-muted-foreground mb-3">
                Browse by category:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {categories.slice(0, 6).map((cat) => (
                  <Button
                    key={cat.id}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleFilterChange({
                        ...activeFilters,
                        categoryId: String(cat.id),
                      })
                    }
                    className="rounded-full"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-[88px] bg-background border-b border-border -mx-4 px-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
