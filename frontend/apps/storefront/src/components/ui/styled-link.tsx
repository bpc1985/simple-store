import Link from "next/link";
import { cn } from "@/lib/utils";

export default function StyledLink({
  href,
  variant = "default",
  className,
  children,
  onClick,
}: {
  href: string;
  variant?: "default" | "outline";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors h-8 px-2.5";
  const styles =
    variant === "outline"
      ? "border border-border bg-background hover:bg-muted"
      : "bg-primary text-primary-foreground hover:bg-primary/80";
  return (
    <Link href={href} className={cn(base, styles, className)} onClick={onClick}>
      {children}
    </Link>
  );
}
