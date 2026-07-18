import Link from "next/link";
import StyledLink from "@/components/ui/styled-link";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex items-center justify-center size-20 rounded-full bg-muted mb-6">
        <Search className="size-10 text-muted-foreground/40" />
      </div>
      <h1 className="text-3xl font-semibold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Here are some helpful links instead.
      </p>

      <div className="flex items-center gap-3 mb-10">
        <StyledLink href="/">
          <Home className="size-4" />
          Back to Home
        </StyledLink>
        <StyledLink href="/products" variant="outline">
          Browse Products
        </StyledLink>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">Popular Categories</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href="/products?category=Electronics"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            Electronics
          </Link>
          <Link
            href="/products?category=Clothing"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            Clothing
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
          >
            All Categories
          </Link>
        </div>
      </div>
    </div>
  );
}
