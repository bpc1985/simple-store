"use client";

import RegisterForm from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border shadow-lg">
        {/* Brand Panel */}
        <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-600 p-10 text-white">
          <h2 className="text-2xl font-semibold tracking-widest uppercase mb-4">SIMPLESTORE</h2>
          <p className="text-blue-100 leading-relaxed">
            Create an account to track orders, save favorites, and checkout faster.
          </p>
        </div>

        {/* Form Panel */}
        <div className="p-8 sm:p-10">
          <h1 className="text-2xl font-semibold mb-2">Create an account</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Join SimpleStore for a better shopping experience.
          </p>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
