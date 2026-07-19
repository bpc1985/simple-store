package com.simplestore.inventory.dto;

import jakarta.validation.constraints.PositiveOrZero;

public record UpdateStockRequest(@PositiveOrZero int stockLevel) {}
