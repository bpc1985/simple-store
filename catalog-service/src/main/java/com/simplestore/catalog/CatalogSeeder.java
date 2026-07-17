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
                        .price(new BigDecimal("79.99")).imageUrl("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop").stock(150)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Smartphone Case").description("Durable silicone phone case")
                        .price(new BigDecimal("19.99")).imageUrl("https://images.unsplash.com/photo-1601593346740-925612772716?w=400&h=400&fit=crop").stock(300)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("USB-C Charger").description("65W GaN fast charger")
                        .price(new BigDecimal("34.99")).imageUrl("https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&h=400&fit=crop").stock(200)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Bluetooth Speaker").description("Portable waterproof speaker with 12h battery")
                        .price(new BigDecimal("49.99")).imageUrl("https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop").stock(75)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Wireless Mouse").description("Ergonomic wireless mouse with USB-C charging")
                        .price(new BigDecimal("29.99")).imageUrl("https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop").stock(120)
                        .categoryId(electronics.getId()).build(),

                // ── Clothing (5) ────────────────────────────────────────────────
                Product.builder().name("Cotton T-Shirt").description("Classic fit cotton t-shirt")
                        .price(new BigDecimal("24.99")).imageUrl("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop").stock(500)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Denim Jeans").description("Slim fit stretch denim jeans")
                        .price(new BigDecimal("59.99")).imageUrl("https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=400&h=400&fit=crop").stock(250)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Running Shoes").description("Lightweight running shoes")
                        .price(new BigDecimal("89.99")).imageUrl("https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop").stock(180)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Winter Jacket").description("Waterproof insulated winter jacket")
                        .price(new BigDecimal("129.99")).imageUrl("https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop").stock(60)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Baseball Cap").description("Adjustable cotton baseball cap")
                        .price(new BigDecimal("14.99")).imageUrl("https://images.unsplash.com/photo-1588850561407-ed78c282e36b?w=400&h=400&fit=crop").stock(350)
                        .categoryId(clothing.getId()).build(),

                // ── Books (5) ──────────────────────────────────────────────────
                Product.builder().name("Spring Boot in Action").description("Comprehensive guide to Spring Boot")
                        .price(new BigDecimal("44.99")).imageUrl("https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop").stock(100)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Clean Code").description("A handbook of agile software craftsmanship")
                        .price(new BigDecimal("39.99")).imageUrl("https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=400&fit=crop").stock(120)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Design Patterns").description("Elements of Reusable Object-Oriented Software")
                        .price(new BigDecimal("54.99")).imageUrl("https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=400&fit=crop").stock(45)
                        .categoryId(books.getId()).build(),
                Product.builder().name("The Pragmatic Programmer").description("Your journey to mastery")
                        .price(new BigDecimal("49.99")).imageUrl("https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=400&fit=crop").stock(80)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Introduction to Algorithms").description("Comprehensive textbook on algorithms")
                        .price(new BigDecimal("89.99")).imageUrl("https://images.unsplash.com/photo-1515879218367-8466d910auj6?w=400&h=400&fit=crop").stock(30)
                        .categoryId(books.getId()).build(),

                // ── Home & Kitchen (4) ─────────────────────────────────────────
                Product.builder().name("Coffee Maker").description("12-cup programmable coffee maker")
                        .price(new BigDecimal("49.99")).imageUrl("https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop").stock(80)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Non-Stick Pan Set").description("3-piece non-stick frying pan set")
                        .price(new BigDecimal("64.99")).imageUrl("https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop").stock(90)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Robot Vacuum").description("Smart robot vacuum with mapping")
                        .price(new BigDecimal("299.99")).imageUrl("https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop").stock(25)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Scented Candle Set").description("Set of 6 soy wax scented candles")
                        .price(new BigDecimal("24.99")).imageUrl("https://images.unsplash.com/photo-1603006905003-be475563bc59?w=400&h=400&fit=crop").stock(200)
                        .categoryId(home.getId()).build(),

                // ── Sports & Outdoors (4) ──────────────────────────────────────
                Product.builder().name("Yoga Mat").description("Extra thick non-slip yoga mat")
                        .price(new BigDecimal("34.99")).imageUrl("https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop").stock(150)
                        .categoryId(sports.getId()).build(),
                Product.builder().name("Resistance Bands Set").description("Set of 5 resistance bands with carry bag")
                        .price(new BigDecimal("19.99")).imageUrl("https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop").stock(220)
                        .categoryId(sports.getId()).build(),
                Product.builder().name("Camping Tent").description("4-person waterproof camping tent")
                        .price(new BigDecimal("159.99")).imageUrl("https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=400&fit=crop").stock(15)
                        .categoryId(sports.getId()).build(),
                Product.builder().name("Cycling Helmet").description("Lightweight ventilated cycling helmet")
                        .price(new BigDecimal("44.99")).imageUrl("https://images.unsplash.com/photo-1557803175-2dfce554d2b3?w=400&h=400&fit=crop").stock(70)
                        .categoryId(sports.getId()).build(),

                // ── Toys & Games (3) ────────────────────────────────────────────
                Product.builder().name("Board Game Collection").description("Classic board game 5-in-1 collection")
                        .price(new BigDecimal("39.99")).imageUrl("https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=400&fit=crop").stock(95)
                        .categoryId(toys.getId()).build(),
                Product.builder().name("Building Blocks 1000pc").description("1000-piece creative building blocks set")
                        .price(new BigDecimal("29.99")).imageUrl("https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=400&fit=crop").stock(130)
                        .categoryId(toys.getId()).build(),
                Product.builder().name("Puzzle 2000pc").description("2000-piece landscape puzzle")
                        .price(new BigDecimal("19.99")).imageUrl("https://images.unsplash.com/photo-1618840384e8cea65c2191c?w=400&h=400&fit=crop").stock(60)
                        .categoryId(toys.getId()).build()
        ));

        var total = productRepository.count();
        log.info("Seeded {} categories and {} products.", 6, total);
    }
}
