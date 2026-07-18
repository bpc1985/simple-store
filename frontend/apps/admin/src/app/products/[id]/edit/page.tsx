"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@simplestore/ui";
import { Input } from "@simplestore/ui";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@simplestore/ui";
import { Skeleton } from "@simplestore/ui";
import { useProduct, useUpdateProduct, useCategories } from "@/hooks/use-products";
import { ArrowLeft, Loader2 } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be positive"),
  imageUrl: z.string().min(1, "Image URL is required"),
  stock: z.coerce.number().int().min(0, "Stock must be non-negative"),
  categoryId: z.coerce.number().int().positive("Category is required"),
});

type ProductForm = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(id);
  const { data: product, isLoading } = useProduct(productId);
  const updateProduct = useUpdateProduct();
  const { data: categories, isLoading: catLoading } = useCategories();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const selectedCategoryId = watch("categoryId");
  const selectedCategoryName = categories?.find((c) => c.id === selectedCategoryId)?.name;

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        categoryId: product.categoryId,
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductForm) => {
    updateProduct.mutate(
      { id: productId, ...data },
      { onSuccess: () => router.push("/products") },
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <Link
        href="/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Products
      </Link>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Edit Product
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Update product #{productId}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium">Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">Description</Label>
            <Input id="description" {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-xs font-medium">Price ($)</Label>
              <Input id="price" type="number" step="0.01" {...register("price")} />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock" className="text-xs font-medium">Stock</Label>
              <Input id="stock" type="number" {...register("stock")} />
              {errors.stock && (
                <p className="text-xs text-destructive">{errors.stock.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl" className="text-xs font-medium">Image URL</Label>
            <Input id="imageUrl" {...register("imageUrl")} />
            {errors.imageUrl && (
              <p className="text-xs text-destructive">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryId" className="text-xs font-medium">Category</Label>
            <Select
              value={selectedCategoryId != null ? String(selectedCategoryId) : ""}
              onValueChange={(v) => {
                if (v) setValue("categoryId", Number(v), { shouldValidate: true });
              }}
            >
              <SelectTrigger>
                {selectedCategoryName ?? <span className="text-muted-foreground">Select a category</span>}
              </SelectTrigger>
              <SelectContent>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting || updateProduct.isPending}>
              {updateProduct.isPending ? (
                <><Loader2 className="size-4 animate-spin" /> Updating...</>
              ) : (
                "Update Product"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
