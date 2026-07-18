"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/page-header";
import SearchInput from "@/components/ui/search-input";
import { Card, CardContent } from "@simplestore/ui";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import StyledLink from "@/components/ui/styled-link";

const FAQ_DATA = [
  {
    category: "Shipping",
    id: "shipping",
    questions: [
      { q: "How much is shipping?", a: "Free shipping on orders over $50. Standard shipping is $5.99 (3-5 business days). Express shipping is $12.99 (1-2 business days)." },
      { q: "How long does delivery take?", a: "Standard: 3-5 business days. Express: 1-2 business days. International shipping times vary by destination." },
      { q: "Do you ship internationally?", a: "Currently, we only ship within the United States. International shipping is coming soon." },
    ],
  },
  {
    category: "Returns",
    id: "returns",
    questions: [
      { q: "What's your return policy?", a: "You can return most items within 30 days of delivery for a full refund. Items must be unused and in original packaging." },
      { q: "How do I return an item?", a: "Contact our support team or initiate a return from your order details page. We'll provide a prepaid return label." },
      { q: "How long do refunds take?", a: "Refunds are processed within 5-7 business days after we receive your returned items." },
    ],
  },
  {
    category: "Orders",
    id: "orders",
    questions: [
      { q: "How do I track my order?", a: "Visit My Orders in your account to view order status. You'll also receive email updates at each stage." },
      { q: "Can I cancel my order?", a: "Orders in PENDING status can be cancelled from your order details page. Once confirmed, cancellations may not be possible." },
      { q: "Can I change my shipping address?", a: "Contact support within 1 hour of placing your order for address changes. After that, changes may not be possible." },
    ],
  },
  {
    category: "Payment",
    id: "payment",
    questions: [
      { q: "What payment methods do you accept?", a: "We accept all major credit cards, debit cards, and PayPal. All payments are processed securely via SSL encryption." },
      { q: "Is my payment information secure?", a: "Yes. We use SSL encryption and never store your full credit card details. Payments are processed through secure PCI-compliant gateways." },
    ],
  },
  {
    category: "Account",
    id: "account",
    questions: [
      { q: "Do I need an account to shop?", a: "You can browse and add items to your cart without an account. Checkout requires an account to track your orders." },
      { q: "How do I reset my password?", a: "Use the 'Forgot password?' link on the login page. You'll receive an email with reset instructions." },
    ],
  },
];

function FAQContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(urlSearch);

  // Sync URL search param on mount
  useEffect(() => {
    if (urlSearch) setSearch(urlSearch);
  }, [urlSearch]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!search) return FAQ_DATA;
    const q = search.toLowerCase();
    return FAQ_DATA
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [search]);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Frequently Asked Questions"
        description="Find answers to common questions about shipping, returns, orders, and more."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search FAQs..."
        className="mb-8"
      />

      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircleQuestion className="size-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              No results for &quot;{search}&quot;.
            </p>
            <button
              onClick={() => setSearch("")}
              className="text-sm text-primary hover:underline"
            >
              Clear search
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredData.map((category) => (
            <Card key={category.id} id={category.id}>
              <button
                onClick={() =>
                  setOpenCategory(openCategory === category.id ? null : category.id)
                }
                className="w-full flex items-center justify-between p-5 font-semibold text-left"
              >
                {category.category}
                <ChevronDown
                  className={`size-5 transition-transform duration-200 ${
                    openCategory === category.id ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openCategory === category.id && (
                <div className="px-5 pb-5 space-y-3">
                  {category.questions.map((item) => (
                    <div key={item.q} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                      <p className="text-sm font-medium mb-1">{item.q}</p>
                      <p className="text-sm text-muted-foreground">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Still have questions?
        </p>
        <StyledLink href="/contact" variant="outline">
          Contact Us
        </StyledLink>
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <Suspense>
      <FAQContent />
    </Suspense>
  );
}
