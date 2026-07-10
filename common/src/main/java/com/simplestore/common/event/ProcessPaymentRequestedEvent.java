package com.simplestore.common.event;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

public record ProcessPaymentRequestedEvent(
        UUID correlationId,
        String userId,
        BigDecimal amount
) implements Serializable {}
