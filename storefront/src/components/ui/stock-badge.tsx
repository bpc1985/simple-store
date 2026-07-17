import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StockBadgeProps {
  stock: number;
  lowStockThreshold?: number;
  className?: string;
}

/**
 * Semantic stock badge: In Stock (green), Low Stock (amber), Out of Stock (red).
 * Shows count only when stock is available and above the low threshold.
 */
export default function StockBadge({
  stock,
  lowStockThreshold = 5,
  className,
}: StockBadgeProps) {
  if (stock <= 0) {
    return (
      <Badge variant="destructive" className={cn("gap-1.5 px-3 py-1", className)}>
        <XCircle className="size-3" />
        Out of Stock
      </Badge>
    );
  }

  if (stock <= lowStockThreshold) {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-50",
          "dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-950",
          className
        )}
      >
        <AlertTriangle className="size-3" />
        Only {stock} left
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
        "dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-950",
        className
      )}
    >
      <CheckCircle className="size-3" />
      In Stock
    </Badge>
  );
}
