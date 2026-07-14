"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as inventoryService from "@/services/inventory-service";

export function useStockLevels(page: number) {
  return useQuery({
    queryKey: ["stock-levels", page],
    queryFn: () => inventoryService.getStockLevels(page),
  });
}

export function useUpdateStockLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, stockLevel }: { productId: number; stockLevel: number }) =>
      inventoryService.updateStockLevel(productId, stockLevel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-levels"] });
      toast.success("Stock level updated");
    },
    onError: () => toast.error("Failed to update stock level"),
  });
}
