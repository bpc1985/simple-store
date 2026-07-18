"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProducts, useCategories } from "@/hooks/use-products";
import ProductGrid from "@/components/products/product-grid";
import ProductSkeleton from "@/components/products/product-skeleton";
import FilterPanel, { type ActiveFilters } from "@/components/products/filter-panel";
import SearchInput from "@/components/ui/search-input";
import SortDropdown from "@/components/ui/sort-dropdown";
import { Button } from "@simplestore/ui";
import { X, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/types";

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryId = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = searchParams.get("sort") || "";

  // Page is local state only — not in URL
  const [page, setPage] = useState(0);

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

  // Reset page when search/filters/sort change
  useEffect(() => {
    setPage(0);
  }, [search, categoryId, sort, activeFilters.categoryId, activeFilters.inStockOnly, activeFilters.minPrice, activeFilters.maxPrice]);

  // Accumulate loaded products across pages so "Show More" appends instead of replacing
  const [allItems, setAllItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!productsData?.items) return;
    if (page === 0) {
      // Reset: new search/filter/sort
      setAllItems(productsData.items);
    } else {
      // Append with dedup — stale data from keepPreviousData gets filtered out naturally
      setAllItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = productsData.items.filter(
          (p) => !existingIds.has(p.id)
        );
        return [...prev, ...newItems];
      });
    }
  }, [page, productsData?.items]);

  // Client-side sort applied to accumulated items
  const sortedItems = useMemo(() => {
    if (!allItems.length) return undefined;
    const items = [...allItems];
    switch (sort) {
      case "price_asc":
        return items.sort((a, b) => a.price - b.price);
      case "price_desc":
        return items.sort((a, b) => b.price - a.price);
      case "name_asc":
        return items.sort((a, b) => a.name.localeCompare(b.name));
      case "newest":
        return items.sort((a, b) => b.id - a.id);
      default:
        return items;
    }
  }, [sort, allItems]);

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      const merged = {
        search: search || undefined,
        category: categoryId,
        sort: sort || undefined,
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
      router.push(buildUrl({ search: value || undefined }));
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
    setPage((p) => p + 1);
  }, []);

  const totalCount = productsData?.totalCount ?? 0;
  const hasMore = allItems.length < totalCount;

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
      label: "In Stock Only",
      onRemove: () =>
        handleFilterChange({ ...activeFilters, inStockOnly: false }),
    });
  }
  if (activeFilters.minPrice !== undefined) {
    filterChips.push({
      label: `≥ $${activeFilters.minPrice}`,
      onRemove: () =>
        handleFilterChange({ ...activeFilters, minPrice: undefined }),
    });
  }
  if (activeFilters.maxPrice !== undefined) {
    filterChips.push({
      label: `≤ $${activeFilters.maxPrice}`,
      onRemove: () =>
        handleFilterChange({ ...activeFilters, maxPrice: undefined }),
    });
  }
  const hasActiveFilters = filterChips.length > 0 || !!search;

  // Find active category name for breadcrumb
  const activeCategory = activeFilters.categoryId
    ? categories?.find((c) => String(c.id) === activeFilters.categoryId)
    : null;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/"
          className="hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        {activeCategory ? (
          <>
            <Link
              href="/products"
              className="hover:text-foreground transition-colors"
            >
              Shop
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground font-medium">
              {activeCategory.name}
            </span>
          </>
        ) : (
          <span className="text-foreground font-medium">Shop</span>
        )}
      </nav>

      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-[72px] z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border space-y-2.5">
        {/* Search + Filter + Sort */}
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
        {((search && !isLoading) || hasActiveFilters) && (
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoading && search && (
              <span className="text-xs text-muted-foreground font-medium">
                {totalCount > 0
                  ? `${totalCount} result${totalCount !== 1 ? "s" : ""}`
                  : "No products found"}
              </span>
            )}
            {filterChips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 hover:bg-primary/20 transition-colors"
              >
                {chip.label}
                <X className="size-3" />
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-0.5 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main Content (full width) ── */}
      {!allItems.length && isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : sortedItems && sortedItems.length > 0 ? (
        <>
          <div className={isLoading ? "opacity-70 pointer-events-none transition-opacity" : ""}>
            <ProductGrid products={sortedItems} />
          </div>

          {/* Load More */}
          <div className="flex flex-col items-center gap-3 pt-4 pb-10">
            {isLoading ? (
              <Button variant="outline" size="lg" disabled className="rounded-full px-10 min-w-[180px] h-11">
                Loading...
              </Button>
            ) : hasMore ? (
              <Button
                variant="outline"
                size="lg"
                onClick={handleLoadMore}
                className="rounded-full px-10 min-w-[180px] h-11"
              >
                Show More
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">
                You&apos;ve viewed all {sortedItems.length} products
              </p>
            )}
            {totalCount > sortedItems.length && !isLoading && (
              <p className="text-xs text-muted-foreground">
                Showing {sortedItems.length} of {totalCount} products
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <Search className="size-16 text-muted-foreground/15 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No products found</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm leading-relaxed">
            {search
              ? `No results for "${search}". Try a different search term or browse categories below.`
              : "Try adjusting your filters or check back later for new products."}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="size-4" />
                Clear Filters
              </Button>
            )}
            <Button onClick={() => router.push("/products")}>
              Browse All Products
            </Button>
          </div>

          {categories && categories.length > 0 && (
            <div className="mt-10">
              <p className="text-sm text-muted-foreground mb-3 font-medium">
                Browse by category
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((cat) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
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
