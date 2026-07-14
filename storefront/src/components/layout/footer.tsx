"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Footer() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="border-t border-border pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 mb-10">
          {/* Brand */}
          <div>
            <h4 className="font-[family-name:var(--font-heading)] text-sm font-semibold tracking-widest uppercase mb-3">
              SimpleStore
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium essentials. Thoughtfully curated, impeccably crafted.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-[family-name:var(--font-heading)] text-sm font-semibold tracking-widest uppercase mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Products
                </Link>
              </li>
              <li>
                <Link
                  href="/cart"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="font-[family-name:var(--font-heading)] text-sm font-semibold tracking-widest uppercase mb-3">
              Account
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/account/orders"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Orders
                </Link>
              </li>
              {!isAuthenticated && (
                <li>
                  <Link
                    href="/account/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border/50">
          &copy; {new Date().getFullYear()} SimpleStore. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
