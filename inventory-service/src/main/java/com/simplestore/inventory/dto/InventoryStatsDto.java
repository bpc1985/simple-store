package com.simplestore.inventory.dto;

public record InventoryStatsDto(long totalProducts, long totalReservations, long lowStockCount) {}
