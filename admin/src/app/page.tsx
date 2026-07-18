"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useSubscriptionStats } from "@/hooks/use-subscriptions";
import {
  ShoppingBag, DollarSign, Clock, CheckCircle2,
  TrendingUp, Package, AlertTriangle, Repeat,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const statsConfig = [
  {
    key: "totalOrders" as const,
    label: "Total Orders",
    icon: ShoppingBag,
    gradient: "from-blue-500/15 to-blue-600/5",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    valueColor: "text-blue-300",
  },
  {
    key: "totalRevenue" as const,
    label: "Revenue",
    icon: DollarSign,
    format: formatCurrency,
    gradient: "from-emerald-500/15 to-emerald-600/5",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    valueColor: "text-emerald-300",
  },
  {
    key: "pendingOrders" as const,
    label: "Pending",
    icon: Clock,
    gradient: "from-amber-500/15 to-amber-600/5",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    valueColor: "text-amber-300",
  },
  {
    key: "confirmedOrders" as const,
    label: "Confirmed",
    icon: CheckCircle2,
    gradient: "from-violet-500/15 to-violet-600/5",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    valueColor: "text-violet-300",
  },
];

function ChartTooltip({ active, payload, label, valueFormatter, labelFormatter }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const fmt = valueFormatter ?? String;
  return (
    <div className="rounded-lg border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {labelFormatter ? labelFormatter(label ?? "") : label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-semibold tabular-nums" style={{ color: entry.color }}>
          {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
}

function SubscriptionStatCards() {
  const { data: subStats, isLoading: subLoading } = useSubscriptionStats();

  return (
    <>
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/15 to-sky-600/5 opacity-60" />
        <div className="relative flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active Subs
            </p>
            {subLoading ? (
              <Skeleton className="h-9 w-24 mt-0.5" />
            ) : (
              <p className="text-3xl font-bold tabular-nums tracking-tight text-sky-300">
                {subStats?.activeCount ?? "--"}
              </p>
            )}
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/15">
            <Repeat className="size-5 text-sky-400" />
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 opacity-60" />
        <div className="relative flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              MRR
            </p>
            {subLoading ? (
              <Skeleton className="h-9 w-24 mt-0.5" />
            ) : (
              <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-300">
                {subStats
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    }).format(subStats.mrr)
                  : "--"}
              </p>
            )}
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15">
            <DollarSign className="size-5 text-emerald-400" />
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your store performance
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load dashboard data</p>
            <p className="text-xs text-muted-foreground">Check your backend connection and try again.</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsConfig.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-60`} />

              <div className="relative flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-9 w-24 mt-0.5" />
                  ) : isError ? (
                    <p className="text-2xl font-bold text-muted-foreground/40 tabular-nums">--</p>
                  ) : (
                    <p className={`text-3xl font-bold tabular-nums tracking-tight ${item.valueColor}`}>
                      {item.format && stats
                        ? item.format(stats[item.key] as number)
                        : stats?.[item.key] ?? "--"}
                    </p>
                  )}
                </div>
                <div className={`flex size-10 items-center justify-center rounded-lg ${item.iconBg}`}>
                  <Icon className={`size-5 ${item.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
        <SubscriptionStatCards />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Revenue Over Time */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Revenue Trend</h3>
              <p className="text-xs text-muted-foreground">Daily revenue</p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : !stats?.revenueByDate?.length ? (
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground/30 gap-2">
              <TrendingUp className="size-10" />
              <p className="text-xs text-muted-foreground/50">No order data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.revenueByDate} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d: string) => {
                    const parts = d.split("-");
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShort}
                  width={48}
                />
                <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <Package className="size-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Top Products</h3>
              <p className="text-xs text-muted-foreground">By revenue generated</p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : !stats?.topProducts?.length ? (
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground/30 gap-2">
              <Package className="size-10" />
              <p className="text-xs text-muted-foreground/50">No product sales yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.topProducts}
                layout="vertical"
                margin={{ top: 0, right: 4, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatShort}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tickFormatter={(n: string) => n.length > 14 ? n.slice(0, 13) + "…" : n}
                />
                <Tooltip content={<ChartTooltip valueFormatter={formatCurrency} />} />
                <Bar
                  dataKey="revenue"
                  fill="hsl(160 60% 52%)"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
