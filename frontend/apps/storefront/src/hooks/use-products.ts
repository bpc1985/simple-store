"use client";

import { useQuery } from "@tanstack/react-query";
import * as catalogService from "@/services/catalog-service";

export function useProducts(
  page = 0,
  categoryId?: string,
  search?: string
) {
  return useQuery({
    queryKey: ["products", page, categoryId, search],
    queryFn: () => catalogService.getProducts(page, categoryId, search),
    placeholderData: (prev) => prev,
    staleTime: 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => catalogService.getProduct(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: catalogService.getCategories,
    staleTime: 5 * 60 * 1000,
  });
}
