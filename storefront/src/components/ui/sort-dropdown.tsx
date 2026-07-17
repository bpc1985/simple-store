"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SortOption = {
  label: string;
  value: string;
};

const DEFAULT_OPTIONS: SortOption[] = [
  { label: "Relevance", value: "" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Newest", value: "newest" },
  { label: "Name: A-Z", value: "name_asc" },
];

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
  className?: string;
}

/**
 * Sort dropdown for product listing.
 * Defaults to price/name/relevance sort options.
 */
export default function SortDropdown({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  className,
}: SortDropdownProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
    >
      <SelectTrigger
        className={cn("h-9 w-[180px] text-sm", className)}
        aria-label="Sort products"
      >
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
