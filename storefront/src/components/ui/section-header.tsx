import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

/**
 * Section title with optional "View all" link.
 * Used on homepage sections, product recommendations.
 */
export default function SectionHeader({
  title,
  viewAllHref,
  viewAllLabel = "View All",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-6", className)}>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {viewAllLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
