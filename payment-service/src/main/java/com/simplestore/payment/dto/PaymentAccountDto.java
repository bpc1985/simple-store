package com.simplestore.payment.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentAccountDto(
        UUID id,
        String userId,
        BigDecimal balance
) {}
