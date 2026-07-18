"use client";

import { useEffect } from "react";
import { Button } from "@simplestore/ui";

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Cart error:", error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto py-16 text-center">
      <h1 className="text-2xl font-semibold mb-3">Failed to load cart</h1>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Check your connection and try again.
      </p>
      <Button onClick={reset}>Retry</Button>
    </div>
  );
}
