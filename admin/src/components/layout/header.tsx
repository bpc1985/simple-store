"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-auth";

interface HeaderProps {
  onMenuClick: () => void;
}

const breadcrumbLabels: Record<string, string> = {
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  users: "Users",
  inventory: "Inventory",
  subscriptions: "Subscriptions",
  plans: "Plans",
  customers: "Customers",
  new: "New",
  edit: "Edit",
};

function breadcrumbFromPathname(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", href: "/" }];

  return segments.map((s, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label =
      breadcrumbLabels[s] ??
      (/^\d+$/.test(s) ? `#${s}` : s.charAt(0).toUpperCase() + s.slice(1));
    return { label, href };
  });
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const logout = useLogout();
  const crumbs = breadcrumbFromPathname(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden -ml-1"
        >
          <Menu className="size-5" />
        </Button>

        <nav className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-border select-none">/</span>
              )}
              {i === crumbs.length - 1 ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={logout}
        className="gap-2 text-muted-foreground hover:text-destructive"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline text-sm font-medium">Log out</span>
      </Button>
    </header>
  );
}
