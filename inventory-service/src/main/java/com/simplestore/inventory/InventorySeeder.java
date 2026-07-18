package com.simplestore.inventory;

import com.simplestore.inventory.domain.StockEntry;
import com.simplestore.inventory.repository.StockEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

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

        log.info("Seeding inventory data with varied stock levels...");

        // Product IDs match CatalogSeeder order (1-26)
        int[] stockLevels = {
            150,  // 1  Wireless Headphones
            300,  // 2  Smartphone Case
            200,  // 3  USB-C Charger
            75,   // 4  Bluetooth Speaker
            120,  // 5  Wireless Mouse
            500,  // 6  Cotton T-Shirt
            250,  // 7  Denim Jeans
            180,  // 8  Running Shoes
            60,   // 9  Winter Jacket
            350,  // 10 Baseball Cap
            100,  // 11 Spring Boot in Action
            120,  // 12 Clean Code
            45,   // 13 Design Patterns
            80,   // 14 The Pragmatic Programmer
            30,   // 15 Introduction to Algorithms
            80,   // 16 Coffee Maker
            90,   // 17 Non-Stick Pan Set
            25,   // 18 Robot Vacuum
            200,  // 19 Scented Candle Set
            150,  // 20 Yoga Mat
            220,  // 21 Resistance Bands Set
            15,   // 22 Camping Tent
            70,   // 23 Cycling Helmet
            95,   // 24 Board Game Collection
            130,  // 25 Building Blocks 1000pc
            60,   // 26 Puzzle 2000pc
        };

        List<StockEntry> entries = new ArrayList<>();
        for (int productId = 1; productId <= stockLevels.length; productId++) {
            entries.add(StockEntry.builder()
                    .productId(productId)
                    .stockLevel(stockLevels[productId - 1])
                    .build());
        }
        stockEntryRepository.saveAll(entries);

        log.info("Seeded {} stock entries with varied levels (15-500).", stockLevels.length);
    }
}
