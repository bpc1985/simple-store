"use client";

import { useCategories } from "@/hooks/use-products";
import { Skeleton } from "@simplestore/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@simplestore/ui";
import { FolderTree } from "lucide-react";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Categories
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {categories ? `${categories.length} categories` : "Loading..."}
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : categories?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FolderTree className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No categories found
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              categories?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                    #{c.id}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.description}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
