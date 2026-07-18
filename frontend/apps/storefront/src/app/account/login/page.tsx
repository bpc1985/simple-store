"use client";

import { useLayoutEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/login-form";
import { useAuth } from "@/lib/auth-context";

function LoginContent() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  useLayoutEffect(() => {
    if (isAuthenticated) router.push(returnUrl);
  }, [isAuthenticated, router, returnUrl]);

  if (isAuthenticated) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border shadow-lg">
        {/* Brand Panel */}
        <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-600 p-10 text-white">
          <h2 className="text-2xl font-semibold tracking-widest uppercase mb-4">SIMPLESTORE</h2>
          <p className="text-blue-100 leading-relaxed">
            Welcome back! Sign in to access your orders, track shipments, and manage your account.
          </p>
        </div>

        {/* Form Panel */}
        <div className="p-8 sm:p-10">
          <h1 className="text-2xl font-semibold mb-6">Welcome back</h1>
          <LoginForm returnUrl={returnUrl} />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
