"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal } from "lucide-react";
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

/**
 * Mobile filter sheet + desktop sidebar.
 * Categories as checkboxes, price range, in-stock toggle.
 */
export default function FilterPanel({
  categories,
  activeFilters,
  onChange,
  onClear,
  className,
}: FilterPanelProps) {
  const [localMin, setLocalMin] = useState("");
  const [localMax, setLocalMax] = useState("");
  const hasActive = !!(
    activeFilters.categoryId ||
    activeFilters.inStockOnly ||
    (activeFilters.minPrice !== undefined) ||
    (activeFilters.maxPrice !== undefined)
  );
  const [open, setOpen] = useState(false);

  // Sync local price inputs on open
  useEffect(() => {
    if (open) {
      setLocalMin(activeFilters.minPrice?.toString() ?? "");
      setLocalMax(activeFilters.maxPrice?.toString() ?? "");
    }
  }, [open, activeFilters.minPrice, activeFilters.maxPrice]);

  const applyPrice = () => {
    onChange({
      ...activeFilters,
      minPrice: localMin ? parseFloat(localMin) : undefined,
      maxPrice: localMax ? parseFloat(localMax) : undefined,
    });
  };

  const toggleCategory = (id: string) => {
    onChange({
      ...activeFilters,
      categoryId: activeFilters.categoryId === id ? undefined : id,
    });
    // Close sheet after selection on mobile for better UX
    setOpen(false);
  };

  const toggleInStock = () => {
    onChange({
      ...activeFilters,
      inStockOnly: !activeFilters.inStockOnly,
    });
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Categories</h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(String(cat.id))}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                activeFilters.categoryId === String(cat.id)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={applyPrice}
            className="h-9 text-sm"
            inputMode="numeric"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={applyPrice}
            className="h-9 text-sm"
            inputMode="numeric"
          />
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Availability</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={activeFilters.inStockOnly}
            onChange={toggleInStock}
            className="size-4 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm">In Stock Only</span>
        </label>
      </div>

      {/* Clear */}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onClear();
            setOpen(false);
          }}
          className="text-muted-foreground hover:text-foreground w-full"
        >
          <X className="size-3.5" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: sheet */}
      <div className={cn("lg:hidden", className)}>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-sm font-medium h-9 px-2.5 hover:bg-muted hover:text-foreground transition-colors"
            )}
          >
              <SlidersHorizontal className="size-3.5" />
              Filters
              {hasActive && (
                <span className="flex items-center justify-center size-4 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  !
                </span>
              )}
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:w-80">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{filterContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: sidebar */}
      <div className="hidden lg:block w-56 shrink-0">{filterContent}</div>
    </>
  );
}
