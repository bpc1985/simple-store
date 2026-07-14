"use client";

import Link from "next/link";
import { useProducts, useCategories } from "@/hooks/use-products";
import ProductGrid from "@/components/products/product-grid";
import ProductSkeleton from "@/components/products/product-skeleton";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const { data: productsData, isLoading } = useProducts(0);
  const { data: categories } = useCategories();

  return (
    <div className="space-y-20">
      {/* Hero — Liquid Glass gradient */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-amber-50 px-6 py-24 text-center sm:py-32">
        {/* Glass orb decorations */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-br from-amber-400/15 to-orange-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/5 via-indigo-400/5 to-transparent rounded-full blur-2xl" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-white/60 backdrop-blur-sm px-4 py-1.5 text-xs font-medium tracking-[0.2em] uppercase text-blue-600">
            <Sparkles className="size-3" />
            Premium Collection 2026
          </span>
          <h1 className="mt-6 font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Elegance in Every Detail
          </h1>
          <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
            Discover our curated selection of premium products — where quality meets sophistication. Elevate your everyday.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 text-white px-8 py-3.5 text-base font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/25 transition-all duration-300 hover:-translate-y-0.5"
            >
              Explore Collection
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/products?category=Electronics"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 backdrop-blur-sm text-slate-700 px-6 py-3.5 text-sm font-medium hover:bg-white hover:border-slate-300 transition-all duration-300"
            >
              Best Sellers
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="mb-10 text-center">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-blue-600 mb-3">
            Handpicked For You
          </p>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Featured Products
          </h2>
          <div className="mt-3 mx-auto h-[2px] w-16 bg-gradient-to-r from-blue-500 to-amber-400" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : productsData?.items && productsData.items.length > 0 ? (
          <ProductGrid products={productsData.items.slice(0, 8)} />
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500">No products available yet.</p>
          </div>
        )}
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section>
          <div className="mb-10 text-center">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-blue-600 mb-3">
              Browse
            </p>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Shop by Category
            </h2>
            <div className="mt-3 mx-auto h-[2px] w-16 bg-gradient-to-r from-blue-500 to-amber-400" />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.id}`}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
