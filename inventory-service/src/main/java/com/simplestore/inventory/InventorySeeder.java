package com.simplestore.inventory;

import com.simplestore.inventory.domain.StockEntry;
import com.simplestore.inventory.repository.StockEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventorySeeder implements CommandLineRunner {

    private final StockEntryRepository stockEntryRepository;

    @Override
    public void run(String... args) {
        if (stockEntryRepository.count() > 0) {
            log.info("Stock entries already exist, skipping seed.");
            return;
        }

        log.info("Seeding inventory data...");

        for (int productId = 1; productId <= 10; productId++) {
            StockEntry entry = StockEntry.builder()
                    .productId(productId)
                    .stockLevel(100)
                    .build();
            stockEntryRepository.save(entry);
        }

        log.info("Seeded {} stock entries with stockLevel=100.", 10);
    }
}
