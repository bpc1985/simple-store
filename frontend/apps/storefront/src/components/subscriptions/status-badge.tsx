"use client";

import { Badge } from "@simplestore/ui";
import {
  CheckCircle,
  PauseCircle,
  XCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Package,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface StatusMeta {
  variant: BadgeVariant;
  icon: LucideIcon;
  label: string;
  /** Additional CSS classes for color */
  className?: string;
}

const SUBSCRIPTION_STATUS: Record<string, StatusMeta> = {
  ACTIVE: {
    variant: "default",
    icon: CheckCircle,
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-700",
  },
  PAUSED: {
    variant: "secondary",
    icon: PauseCircle,
    label: "Paused",
    className: "bg-amber-500/15 text-amber-700",
  },
  CANCELLED: {
    variant: "secondary",
    icon: XCircle,
    label: "Cancelled",
  },
  PAYMENT_FAILED: {
    variant: "destructive",
    icon: AlertTriangle,
    label: "Payment Failed",
  },
};

const CYCLE_STATUS: Record<string, StatusMeta> = {
  PENDING: { variant: "outline", icon: Clock, label: "Pending" },
  CHARGED: {
    variant: "default",
    icon: CreditCard,
    label: "Charged",
    className: "bg-emerald-500/15 text-emerald-700",
  },
  ASSEMBLING: {
    variant: "secondary",
    icon: Package,
    label: "Assembling",
  },
  SHIPPED: { variant: "default", icon: Truck, label: "Shipped" },
  FAILED: {
    variant: "destructive",
    icon: AlertTriangle,
    label: "Failed",
  },
};

interface StatusBadgeProps {
  status: string;
  /** "subscription" (default) or "cycle" */
  variant?: "subscription" | "cycle";
}

export default function StatusBadge({
  status,
  variant = "subscription",
}: StatusBadgeProps) {
  const map = variant === "cycle" ? CYCLE_STATUS : SUBSCRIPTION_STATUS;
  const meta = map[status] ?? {
    variant: "secondary" as BadgeVariant,
    icon: XCircle,
    label: status,
  };
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant} className={`gap-1.5 ${meta.className ?? ""}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}
