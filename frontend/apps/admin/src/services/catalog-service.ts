import { api } from "@/lib/api";
import { Category, PagedResult, Product } from "@/types";

export async function getProducts(page = 0): Promise<PagedResult<Product>> {
  const { data } = await api.get<PagedResult<Product>>("/api/v1/catalog/products", { params: { page } });
  return data;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await api.get<Product>(`/api/v1/catalog/products/${id}`);
  return data;
}

export async function createProduct(product: Omit<Product, "id" | "categoryName">): Promise<Product> {
  const { data } = await api.post<Product>("/api/v1/catalog/products", product);
  return data;
}

export async function updateProduct(id: number, product: Partial<Omit<Product, "id" | "categoryName">>): Promise<Product> {
  const { data } = await api.put<Product>(`/api/v1/catalog/products/${id}`, product);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/api/v1/catalog/products/${id}`);
}

export async function getCategories(page = 0): Promise<Category[]> {
  const { data } = await api.get<PagedResult<Category>>("/api/v1/catalog/categories", { params: { page, pageSize: 100 } });
  return data.items;
}
