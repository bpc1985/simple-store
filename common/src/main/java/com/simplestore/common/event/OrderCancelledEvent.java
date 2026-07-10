package com.simplestore.common.event;

import java.io.Serializable;
import java.util.UUID;

public record OrderCancelledEvent(
        UUID correlationId,
        String userId,
        String reason
) implements Serializable {}
