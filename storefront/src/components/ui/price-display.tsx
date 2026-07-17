import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Formatted price with tabular numbers.
 * Regular prices use foreground. Sale prices show strikethrough original + destructive sale price.
 */
export default function PriceDisplay({
  price,
  originalPrice,
  size = "md",
  className,
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl sm:text-2xl",
  };

  const onSale = originalPrice !== undefined && originalPrice > price;

  return (
    <span
      data-slot="price"
      className={cn("font-medium inline-flex items-baseline gap-2", className)}
    >
      {onSale ? (
        <>
          <span
            className={cn(
              "line-through text-muted-foreground font-normal",
              size === "lg" ? "text-base" : "text-xs"
            )}
          >
            ${originalPrice.toFixed(2)}
          </span>
          <span className={cn("text-destructive font-semibold", sizeClasses[size])}>
            ${price.toFixed(2)}
          </span>
        </>
      ) : (
        <span className={cn("text-foreground font-semibold", sizeClasses[size])}>
          ${price.toFixed(2)}
        </span>
      )}
    </span>
  );
}
