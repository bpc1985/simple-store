import api from "@/lib/api";
import type { Product, Category, PagedResult } from "@/types";

export async function getProducts(
  page = 0,
  categoryId?: string,
  search?: string
): Promise<PagedResult<Product>> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (categoryId) params.set("categoryId", categoryId);
  if (search) params.set("search", search);
  return api.get(`/api/v1/catalog/products?${params.toString()}`);
}

export async function getProduct(id: string): Promise<Product> {
  return api.get(`/api/v1/catalog/products/${id}`);
}

export async function getCategories(): Promise<Category[]> {
  const result = await api.get<PagedResult<Category>>(
    "/api/v1/catalog/categories"
  );
  return result.items;
}
