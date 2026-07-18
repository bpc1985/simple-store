import { api } from "@/lib/api";
import { PagedResult, StockLevel } from "@/types";

export async function getStockLevels(page = 0): Promise<PagedResult<StockLevel>> {
  const { data } = await api.get<PagedResult<StockLevel>>("/api/v1/inventory/stock-levels", { params: { page } });
  return data;
}

export async function updateStockLevel(productId: number, stockLevel: number): Promise<StockLevel> {
  const { data } = await api.put<StockLevel>(`/api/v1/inventory/stock-levels/${productId}`, { stockLevel });
  return data;
}
