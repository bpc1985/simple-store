package com.simplestore.subscription.dto;

import java.time.LocalDate;

public record CustomerSubscriptionDto(
        String id,
        String userId,
        SubscriptionPlanDto plan,
        String status,
        LocalDate startDate,
        LocalDate nextBillingDate,
        LocalDate lastBillingDate,
        int currentCycle
) {}
