"use client";

import { useState } from "react";
import { useStockLevels, useUpdateStockLevel } from "@/hooks/use-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Warehouse, Loader2 } from "lucide-react";

export default function InventoryPage() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useStockLevels(page);
  const updateStock = useUpdateStockLevel();
  const [edits, setEdits] = useState<Record<number, number>>({});
  const totalPages = data
    ? Math.ceil(data.totalCount / (data.pageSize || 10))
    : 0;

  const handleUpdate = (productId: number) => {
    const newLevel = edits[productId];
    if (newLevel === undefined) return;
    updateStock.mutate(
      { productId, stockLevel: newLevel },
      {
        onSuccess: () =>
          setEdits((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
          }),
      },
    );
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Inventory
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {data ? `${data.totalCount} items` : "Loading..."}
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Product ID</TableHead>
              <TableHead className="text-right">Stock Level</TableHead>
              <TableHead className="w-72">Actions</TableHead>
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
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Warehouse className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No inventory data
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((s) => {
                const currentLevel = edits[s.productId] ?? s.stockLevel;
                const isLow = currentLevel <= 10;
                return (
                  <TableRow key={s.productId}>
                    <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                      #{s.productId}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${
                          isLow
                            ? "bg-destructive/10 text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {currentLevel}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={edits[s.productId] ?? ""}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [s.productId]: Number(e.target.value),
                            }))
                          }
                          placeholder={String(s.stockLevel)}
                          className="h-8 w-24 font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          disabled={
                            edits[s.productId] === undefined ||
                            updateStock.isPending
                          }
                          onClick={() => handleUpdate(s.productId)}
                        >
                          {updateStock.isPending ? (
                            <><Loader2 className="size-3.5 animate-spin" /> Updating...</>
                          ) : (
                            "Update"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
