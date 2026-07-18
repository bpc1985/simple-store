"use client";

import { useState, useEffect } from "react";
import {
  X,
  SlidersHorizontal,
  ChevronDown,
  Tags,
  DollarSign,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export interface ActiveFilters {
  categoryId?: string;
  inStockOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
}

interface FilterPanelProps {
  categories: Category[];
  activeFilters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  onClear: () => void;
  className?: string;
}

type Section = "categories" | "price" | "availability";

/**
 * Collapsible filter sidebar & mobile sheet.
 * Categories as selectable pills, price range with apply, in-stock toggle.
 */
export default function FilterPanel({
  categories,
  activeFilters,
  onChange,
  onClear,
  className,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [localMin, setLocalMin] = useState("");
  const [localMax, setLocalMax] = useState("");
  const [collapsed, setCollapsed] = useState<Set<Section>>(new Set());

  const hasActive = !!(
    activeFilters.categoryId ||
    activeFilters.inStockOnly ||
    activeFilters.minPrice !== undefined ||
    activeFilters.maxPrice !== undefined
  );

  // Sync local price inputs when panel opens
  useEffect(() => {
    if (open) {
      setLocalMin(activeFilters.minPrice?.toString() ?? "");
      setLocalMax(activeFilters.maxPrice?.toString() ?? "");
    }
  }, [open, activeFilters.minPrice, activeFilters.maxPrice]);

  const toggleSection = (section: Section) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const isCollapsed = (section: Section) => collapsed.has(section);

  const applyPrice = () => {
    const min = localMin ? parseFloat(localMin) : undefined;
    const max = localMax ? parseFloat(localMax) : undefined;
    if (min !== undefined && isNaN(min)) return;
    if (max !== undefined && isNaN(max)) return;
    onChange({
      ...activeFilters,
      minPrice: min,
      maxPrice: max,
    });
  };

  const FilterContent = () => (
    <div className="space-y-0 divide-y divide-border px-4">
      {/* ── Categories ── */}
      <div className="pb-5">
        <button
          onClick={() => toggleSection("categories")}
          className="flex w-full items-center justify-between py-3 text-sm font-semibold tracking-tight"
        >
          <span className="inline-flex items-center gap-2">
            <Tags className="size-3.5 text-muted-foreground" />
            Categories
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              isCollapsed("categories") && "-rotate-90"
            )}
          />
        </button>
        {!isCollapsed("categories") && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isActive = activeFilters.categoryId === String(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() =>
                    onChange({
                      ...activeFilters,
                      categoryId: isActive ? undefined : String(cat.id),
                    })
                  }
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Price Range ── */}
      <div className="py-5">
        <button
          onClick={() => toggleSection("price")}
          className="flex w-full items-center justify-between py-3 -mt-3 text-sm font-semibold tracking-tight"
        >
          <span className="inline-flex items-center gap-2">
            <DollarSign className="size-3.5 text-muted-foreground" />
            Price Range
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              isCollapsed("price") && "-rotate-90"
            )}
          />
        </button>
        {!isCollapsed("price") && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="Min"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  className="h-9 pl-6 text-sm"
                  inputMode="decimal"
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                to
              </span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                  className="h-9 pl-6 text-sm"
                  inputMode="decimal"
                />
              </div>
            </div>
            {(activeFilters.minPrice !== undefined ||
              activeFilters.maxPrice !== undefined) && (
              <p className="text-xs text-muted-foreground">
                {activeFilters.minPrice !== undefined
                  ? `$${activeFilters.minPrice}`
                  : "$0"}{" "}
                –{" "}
                {activeFilters.maxPrice !== undefined
                  ? `$${activeFilters.maxPrice}`
                  : "any"}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Availability ── */}
      <div className="pt-5">
        <button
          onClick={() => toggleSection("availability")}
          className="flex w-full items-center justify-between py-3 -mt-3 text-sm font-semibold tracking-tight"
        >
          <span className="inline-flex items-center gap-2">
            <Package className="size-3.5 text-muted-foreground" />
            Availability
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200",
              isCollapsed("availability") && "-rotate-90"
            )}
          />
        </button>
        {!isCollapsed("availability") && (
          <label className="inline-flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={activeFilters.inStockOnly}
                onChange={() =>
                  onChange({
                    ...activeFilters,
                    inStockOnly: !activeFilters.inStockOnly,
                  })
                }
                className="sr-only"
              />
              <div
                className={cn(
                  "h-5 w-9 rounded-full transition-colors duration-200",
                  activeFilters.inStockOnly
                    ? "bg-primary"
                    : "bg-muted-foreground/25"
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    activeFilters.inStockOnly
                      ? "left-[18px]"
                      : "left-0.5"
                  )}
                />
              </div>
            </div>
            <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
              In Stock Only
            </span>
          </label>
        )}
      </div>

      {/* ── Clear All ── */}
      {hasActive && (
        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground w-full justify-start gap-1.5"
          >
            <X className="size-3.5" />
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-sm font-medium h-10 px-3 hover:bg-muted hover:text-foreground transition-colors relative",
          className
        )}
      >
        <SlidersHorizontal className="size-3.5" />
        Filters
        {hasActive && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            !
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-72 sm:w-80">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="mt-6"><FilterContent /></div>
      </SheetContent>
    </Sheet>
  );
}
