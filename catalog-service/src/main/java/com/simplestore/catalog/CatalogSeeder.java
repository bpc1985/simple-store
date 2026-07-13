package com.simplestore.catalog;

import com.simplestore.catalog.model.Category;
import com.simplestore.catalog.model.Product;
import com.simplestore.catalog.repository.CategoryRepository;
import com.simplestore.catalog.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CatalogSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Override
    public void run(String... args) {
        if (categoryRepository.count() > 0) {
            log.info("Categories already exist, skipping seed.");
            return;
        }

        log.info("Seeding catalog data...");

        Category electronics = Category.builder().name("Electronics").description("Electronic devices and gadgets").build();
        Category clothing = Category.builder().name("Clothing").description("Apparel and accessories").build();
        Category books = Category.builder().name("Books").description("Books and literature").build();
        Category home = Category.builder().name("Home & Kitchen").description("Home and kitchen products").build();
        Category sports = Category.builder().name("Sports & Outdoors").description("Sports equipment and outdoor gear").build();
        Category toys = Category.builder().name("Toys & Games").description("Toys, puzzles, and board games").build();

        categoryRepository.saveAll(List.of(electronics, clothing, books, home, sports, toys));

        productRepository.saveAll(List.of(
                // ── Electronics (5) ─────────────────────────────────────────────
                Product.builder().name("Wireless Headphones").description("Noise-cancelling Bluetooth headphones")
                        .price(new BigDecimal("79.99")).imageUrl("/images/headphones.jpg").stock(150)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Smartphone Case").description("Durable silicone phone case")
                        .price(new BigDecimal("19.99")).imageUrl("/images/phonecase.jpg").stock(300)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("USB-C Charger").description("65W GaN fast charger")
                        .price(new BigDecimal("34.99")).imageUrl("/images/charger.jpg").stock(200)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Bluetooth Speaker").description("Portable waterproof speaker with 12h battery")
                        .price(new BigDecimal("49.99")).imageUrl("/images/speaker.jpg").stock(75)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Wireless Mouse").description("Ergonomic wireless mouse with USB-C charging")
                        .price(new BigDecimal("29.99")).imageUrl("/images/mouse.jpg").stock(120)
                        .categoryId(electronics.getId()).build(),

                // ── Clothing (5) ────────────────────────────────────────────────
                Product.builder().name("Cotton T-Shirt").description("Classic fit cotton t-shirt")
                        .price(new BigDecimal("24.99")).imageUrl("/images/tshirt.jpg").stock(500)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Denim Jeans").description("Slim fit stretch denim jeans")
                        .price(new BigDecimal("59.99")).imageUrl("/images/jeans.jpg").stock(250)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Running Shoes").description("Lightweight running shoes")
                        .price(new BigDecimal("89.99")).imageUrl("/images/shoes.jpg").stock(180)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Winter Jacket").description("Waterproof insulated winter jacket")
                        .price(new BigDecimal("129.99")).imageUrl("/images/jacket.jpg").stock(60)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Baseball Cap").description("Adjustable cotton baseball cap")
                        .price(new BigDecimal("14.99")).imageUrl("/images/cap.jpg").stock(350)
                        .categoryId(clothing.getId()).build(),

                // ── Books (5) ──────────────────────────────────────────────────
                Product.builder().name("Spring Boot in Action").description("Comprehensive guide to Spring Boot")
                        .price(new BigDecimal("44.99")).imageUrl("/images/springbook.jpg").stock(100)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Clean Code").description("A handbook of agile software craftsmanship")
                        .price(new BigDecimal("39.99")).imageUrl("/images/cleancode.jpg").stock(120)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Design Patterns").description("Elements of Reusable Object-Oriented Software")
                        .price(new BigDecimal("54.99")).imageUrl("/images/designpatterns.jpg").stock(45)
                        .categoryId(books.getId()).build(),
                Product.builder().name("The Pragmatic Programmer").description("Your journey to mastery")
                        .price(new BigDecimal("49.99")).imageUrl("/images/pragmatic.jpg").stock(80)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Introduction to Algorithms").description("Comprehensive textbook on algorithms")
                        .price(new BigDecimal("89.99")).imageUrl("/images/algorithms.jpg").stock(30)
                        .categoryId(books.getId()).build(),

                // ── Home & Kitchen (4) ─────────────────────────────────────────
                Product.builder().name("Coffee Maker").description("12-cup programmable coffee maker")
                        .price(new BigDecimal("49.99")).imageUrl("/images/coffeemaker.jpg").stock(80)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Non-Stick Pan Set").description("3-piece non-stick frying pan set")
                        .price(new BigDecimal("64.99")).imageUrl("/images/panset.jpg").stock(90)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Robot Vacuum").description("Smart robot vacuum with mapping")
                        .price(new BigDecimal("299.99")).imageUrl("/images/robotvacuum.jpg").stock(25)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Scented Candle Set").description("Set of 6 soy wax scented candles")
                        .price(new BigDecimal("24.99")).imageUrl("/images/candles.jpg").stock(200)
                        .categoryId(home.getId()).build(),

                // ── Sports & Outdoors (4) ──────────────────────────────────────
                Product.builder().name("Yoga Mat").description("Extra thick non-slip yoga mat")
                        .price(new BigDecimal("34.99")).imageUrl("/images/yogamat.jpg").stock(150)
                        .categoryId(sports.getId()).build(),
                Product.builder().name("Resistance Bands Set").description("Set of 5 resistance bands with carry bag")
                        .price(new BigDecimal("19.99")).imageUrl("/images/bands.jpg").stock(220)
                        .categoryId(sports.getId()).build(),
                Product.builder().name("Camping Tent").description("4-person waterproof camping tent")
                        .price(new BigDecimal("159.99")).imageUrl("/images/tent.jpg").stock(15)
                        .categoryId(sports.getId()).build(),
                Product.builder().name("Cycling Helmet").description("Lightweight ventilated cycling helmet")
                        .price(new BigDecimal("44.99")).imageUrl("/images/helmet.jpg").stock(70)
                        .categoryId(sports.getId()).build(),

                // ── Toys & Games (3) ────────────────────────────────────────────
                Product.builder().name("Board Game Collection").description("Classic board game 5-in-1 collection")
                        .price(new BigDecimal("39.99")).imageUrl("/images/boardgames.jpg").stock(95)
                        .categoryId(toys.getId()).build(),
                Product.builder().name("Building Blocks 1000pc").description("1000-piece creative building blocks set")
                        .price(new BigDecimal("29.99")).imageUrl("/images/blocks.jpg").stock(130)
                        .categoryId(toys.getId()).build(),
                Product.builder().name("Puzzle 2000pc").description("2000-piece landscape puzzle")
                        .price(new BigDecimal("19.99")).imageUrl("/images/puzzle.jpg").stock(60)
                        .categoryId(toys.getId()).build()
        ));

        var total = productRepository.count();
        log.info("Seeded {} categories and {} products.", 6, total);
    }
}
