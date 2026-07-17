import Link from "next/link";

export default function LinkPill({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  const cn = active
    ? "inline-flex items-center rounded-full px-5 py-2 text-sm font-medium bg-primary text-primary-foreground transition-all"
    : "inline-flex items-center rounded-full px-5 py-2 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all";
  return (
    <Link href={href} className={cn}>
      {children}
    </Link>
  );
}
