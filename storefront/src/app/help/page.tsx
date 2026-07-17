"use client";

import PageHeader from "@/components/ui/page-header";
import SearchInput from "@/components/ui/search-input";
import StyledLink from "@/components/ui/styled-link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Package,
  RotateCcw,
  CreditCard,
  User,
  Truck,
  Shield,
  HelpCircle,
  Smartphone,
} from "lucide-react";

const TOPICS = [
  { icon: Package, label: "Orders & Tracking", href: "/faq#orders" },
  { icon: RotateCcw, label: "Returns & Refunds", href: "/faq#returns" },
  { icon: CreditCard, label: "Payment & Billing", href: "/faq#payment" },
  { icon: User, label: "Account Help", href: "/faq#account" },
  { icon: Truck, label: "Shipping Info", href: "/faq#shipping" },
  { icon: Shield, label: "Privacy & Security", href: "/faq" },
  { icon: HelpCircle, label: "FAQ", href: "/faq" },
  { icon: Smartphone, label: "Contact Support", href: "/contact" },
];

export default function HelpCenterPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (value: string) => {
    setSearch(value);
    if (value) {
      router.push(`/faq?search=${encodeURIComponent(value)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Help Center"
        description="How can we help you? Search for answers or browse topics below."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Help" }]}
      />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={handleSearch}
        placeholder="Search help articles..."
        className="mb-10 max-w-xl"
      />

      {/* Topic Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <a
              key={topic.label}
              href={topic.href}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/20"
            >
              <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </div>
              <span className="text-sm font-medium text-center">
                {topic.label}
              </span>
            </a>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-muted-foreground mb-3">
          Can&apos;t find what you&apos;re looking for?
        </p>
        <StyledLink href="/contact">
          Contact Support
        </StyledLink>
      </div>
    </div>
  );
}
