"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
}

/**
 * Search input with debounce, clear button, and search icon.
 * Emits onChange after debounce. Immediate visual update (controlled).
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search products...",
  debounceMs = 300,
  className,
  inputClassName,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setLocalValue(next);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(next);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onChange("");
  }, [onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn("pl-10 h-11", localValue && "pr-10", inputClassName)}
        aria-label="Search products"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
