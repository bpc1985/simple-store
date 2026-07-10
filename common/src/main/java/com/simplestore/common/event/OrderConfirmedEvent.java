package com.simplestore.common.event;

import java.io.Serializable;
import java.util.UUID;

public record OrderConfirmedEvent(
        UUID correlationId,
        String userId
) implements Serializable {}
