"use client";

import Link from "next/link";
import type { Category } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  categories: Category[];
  activeCategoryId?: string;
}

export default function CategoryFilter({ categories, activeCategoryId }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/products"
        className={cn(
          "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-all",
          !activeCategoryId
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        )}
      >
        All
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/products?category=${cat.id}`}
          className={cn(
            "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-all",
            activeCategoryId === String(cat.id)
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
