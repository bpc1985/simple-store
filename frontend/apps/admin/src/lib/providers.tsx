"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { AdminLayout } from "@/components/layout/admin-layout";
import { TOKEN_KEY } from "@/lib/api";

// ponytail: single QueryClient instance per client lifetime
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Hydrate auth state once on client — avoids SSR mismatch
  useEffect(() => {
    const isLoginPage = pathname === "/login";
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token && !isLoginPage) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  // Always render null on first pass (both server and client) to match SSR output
  if (!ready) return null;

  const isLoginPage = pathname === "/login";
  if (isLoginPage) return <>{children}</>;

  return <AdminLayout>{children}</AdminLayout>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
