"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as catalogService from "@/services/catalog-service";
import { Product } from "@/types";

export function useProducts(page: number) {
  return useQuery({
    queryKey: ["products", "list", page],
    queryFn: () => catalogService.getProducts(page),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["products", "detail", id],
    queryFn: () => catalogService.getProduct(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogService.getCategories(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (product: Omit<Product, "id" | "categoryName">) =>
      catalogService.createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
    },
    onError: () => toast.error("Failed to create product"),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Omit<Product, "id" | "categoryName">>) =>
      catalogService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
    },
    onError: () => toast.error("Failed to update product"),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => catalogService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: () => toast.error("Failed to delete product"),
  });
}
