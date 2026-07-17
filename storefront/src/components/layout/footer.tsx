"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Footer() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="border-t border-border pt-12 pb-6 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {/* Brand */}
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-3">
              SimpleStore
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quality goods, fair prices. No fuss.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-3">
              Shop
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
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
              <li>
                <Link
                  href="/account/orders"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/wishlist"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-3">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/help"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Contact Us
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

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold tracking-widest uppercase mb-3">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
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
