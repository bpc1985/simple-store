import { Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadge {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const DEFAULT_BADGES: TrustBadge[] = [
  {
    icon: <Truck className="size-5" />,
    label: "Free Shipping",
    description: "On orders over $50",
  },
  {
    icon: <ShieldCheck className="size-5" />,
    label: "Secure Checkout",
    description: "SSL encrypted",
  },
  {
    icon: <RotateCcw className="size-5" />,
    label: "Easy Returns",
    description: "30-day return policy",
  },
];

interface TrustBadgesProps {
  badges?: TrustBadge[];
  className?: string;
}

/**
 * Trust signal bar — icons + labels.
 * Used on homepage, cart, checkout footer.
 */
export default function TrustBadges({
  badges = DEFAULT_BADGES,
  className,
}: TrustBadgesProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-8 py-6 px-4",
        "border-y border-border bg-muted/50",
        className
      )}
    >
      {badges.map((badge) => (
        <div key={badge.label} className="flex items-center gap-3">
          <div className="text-muted-foreground">{badge.icon}</div>
          <div>
            <p className="text-sm font-medium">{badge.label}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
