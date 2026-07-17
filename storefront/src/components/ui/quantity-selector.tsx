"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Reusable +/- quantity control.
 * Min 1 by default. Respects stock cap. Disables minus at min, plus at max.
 */
export default function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = Infinity,
  size = "md",
  className,
}: QuantitySelectorProps) {
  const btnSize = size === "sm" ? "size-8" : "size-10";
  const iconSize = size === "sm" ? "size-3" : "size-3.5";
  const textSize = size === "sm" ? "text-sm" : "text-sm";
  const atMin = quantity <= min;
  const atMax = quantity >= max;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card",
        className
      )}
      role="group"
      aria-label="Quantity selector"
    >
      <button
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={atMin}
        className={cn(
          "flex items-center justify-center text-muted-foreground transition-colors",
          "hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed",
          btnSize
        )}
        aria-label="Decrease quantity"
      >
        <Minus className={iconSize} />
      </button>
      <span
        className={cn(
          "text-center tabular-nums select-none font-medium",
          size === "sm" ? "w-8" : "w-10",
          textSize
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {quantity}
      </span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={atMax}
        className={cn(
          "flex items-center justify-center text-muted-foreground transition-colors",
          "hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed",
          btnSize
        )}
        aria-label="Increase quantity"
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
