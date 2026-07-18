"use client";

import { useEffect } from "react";
import { Button } from "@simplestore/ui";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Checkout error:", error);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto py-16 text-center">
      <h1 className="text-2xl font-semibold mb-3">Something went wrong</h1>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {error.message || "An unexpected error occurred during checkout."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
