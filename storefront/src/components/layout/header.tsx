"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCartContext } from "@/lib/cart-context";
import { useLogout } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  User,
  LogOut,
  Package,
  LogIn,
  UserPlus,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const { isAuthenticated, user, isLoading, logout: clearAuth } = useAuth();
  const { openCart, itemCount, setItemCount } = useCartContext();
  const logout = useLogout();
  const { data: cartData } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (cartData?.items) {
      setItemCount(
        cartData.items.reduce((sum, item) => sum + item.quantity, 0)
      );
    }
  }, [cartData, setItemCount]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSettled: () => {
        clearAuth();
        setItemCount(0);
      },
    });
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-background border-b border-border/50"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="container mx-auto flex h-[72px] items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-widest uppercase"
        >
          SIMPLESTORE
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/products"
            className="nav-link text-sm font-medium tracking-wide uppercase"
          >
            Shop
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Cart button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openCart}
            className="relative"
          >
            <ShoppingCart className="size-[18px]" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Button>

          {/* Auth dropdown - desktop */}
          <div className="hidden md:block">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent size-8 hover:bg-muted hover:text-foreground transition-colors">
                  <User className="size-[18px]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {user?.fullName || user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link
                      href="/account"
                      className="flex items-center gap-1.5 w-full"
                    >
                      <User className="size-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link
                      href="/account/orders"
                      className="flex items-center gap-1.5 w-full"
                    >
                      <Package className="size-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href="/account/login"
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <LogIn className="size-3.5" />
                  Login
                </Link>
                <Link
                  href="/account/register"
                  className="inline-flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <UserPlus className="size-3.5" />
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent size-8 hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Open menu"
              >
                <Menu className="size-[18px]" />
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link
                    href="/products"
                    className="text-sm font-medium hover:text-foreground"
                  >
                    Shop
                  </Link>
                  {!isLoading && (
                    <>
                      <div className="border-t pt-4" />
                      {isAuthenticated ? (
                        <>
                          <Link
                            href="/account/orders"
                            className="text-sm font-medium hover:text-foreground"
                          >
                            My Orders
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="text-sm font-medium text-destructive hover:text-destructive/80 text-left"
                          >
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/account/login"
                            className="text-sm font-medium hover:text-foreground"
                          >
                            Login
                          </Link>
                          <Link
                            href="/account/register"
                            className="text-sm font-medium hover:text-foreground"
                          >
                            Register
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
