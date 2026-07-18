package com.simplestore.subscription;

import com.simplestore.subscription.domain.SubscriptionCadence;
import com.simplestore.subscription.domain.SubscriptionPlan;
import com.simplestore.subscription.repository.SubscriptionPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionSeeder implements CommandLineRunner {

    private final SubscriptionPlanRepository planRepository;

    @Override
    public void run(String... args) {
        if (planRepository.count() > 0) {
            log.info("Subscription plans already exist, skipping seed.");
            return;
        }

        log.info("Seeding subscription plans...");

        var coffeeBox = SubscriptionPlan.builder()
                .name("Coffee Box")
                .description("A curated selection of 3 specialty coffees delivered monthly. Single-origin beans from around the world, roasted fresh each cycle.")
                .price(new BigDecimal("29.99"))
                .cadence(SubscriptionCadence.MONTHLY)
                .imageUrl("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop")
                .active(true)
                .build();

        var snackBox = SubscriptionPlan.builder()
                .name("Snack Box")
                .description("10+ gourmet snacks from artisan producers. A mix of sweet and savory treats delivered to your door every quarter.")
                .price(new BigDecimal("49.99"))
                .cadence(SubscriptionCadence.QUARTERLY)
                .imageUrl("https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop")
                .active(true)
                .build();

        var bookBox = SubscriptionPlan.builder()
                .name("Book Box")
                .description("One bestselling novel + curated extras (bookmark, tea, author notes) delivered monthly. Genres rotate quarterly.")
                .price(new BigDecimal("24.99"))
                .cadence(SubscriptionCadence.MONTHLY)
                .imageUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop")
                .active(true)
                .build();

        var beautyBox = SubscriptionPlan.builder()
                .name("Beauty Box")
                .description("5 deluxe samples + 1 full-size product from premium skincare and makeup brands. Curated by beauty editors.")
                .price(new BigDecimal("39.99"))
                .cadence(SubscriptionCadence.MONTHLY)
                .imageUrl("https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop")
                .active(true)
                .build();

        planRepository.saveAll(List.of(coffeeBox, snackBox, bookBox, beautyBox));

        log.info("Seeded 4 subscription plans: Coffee Box, Snack Box, Book Box, Beauty Box");
    }
}
