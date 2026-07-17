import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import StyledLink from "@/components/ui/styled-link";
import type { ComponentProps } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

/**
 * Icon + message + optional CTA for empty content areas.
 * Consistent pattern across cart, orders, search, wishlist.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      {Icon && (
        <Icon className="size-16 text-muted-foreground/30 mb-4" aria-hidden="true" />
      )}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <StyledLink href={action.href}>
          {action.label}
        </StyledLink>
      )}
    </div>
  );
}
