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

        categoryRepository.saveAll(List.of(electronics, clothing, books, home));

        productRepository.saveAll(List.of(
                Product.builder().name("Wireless Headphones").description("Noise-cancelling Bluetooth headphones")
                        .price(new BigDecimal("79.99")).imageUrl("/images/headphones.jpg").stock(150)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Smartphone Case").description("Durable silicone phone case")
                        .price(new BigDecimal("19.99")).imageUrl("/images/phonecase.jpg").stock(300)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("USB-C Charger").description("65W GaN fast charger")
                        .price(new BigDecimal("34.99")).imageUrl("/images/charger.jpg").stock(200)
                        .categoryId(electronics.getId()).build(),
                Product.builder().name("Cotton T-Shirt").description("Classic fit cotton t-shirt")
                        .price(new BigDecimal("24.99")).imageUrl("/images/tshirt.jpg").stock(500)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Denim Jeans").description("Slim fit stretch denim jeans")
                        .price(new BigDecimal("59.99")).imageUrl("/images/jeans.jpg").stock(250)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Running Shoes").description("Lightweight running shoes")
                        .price(new BigDecimal("89.99")).imageUrl("/images/shoes.jpg").stock(180)
                        .categoryId(clothing.getId()).build(),
                Product.builder().name("Spring Boot in Action").description("Comprehensive guide to Spring Boot")
                        .price(new BigDecimal("44.99")).imageUrl("/images/springbook.jpg").stock(100)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Clean Code").description("A handbook of agile software craftsmanship")
                        .price(new BigDecimal("39.99")).imageUrl("/images/cleancode.jpg").stock(120)
                        .categoryId(books.getId()).build(),
                Product.builder().name("Coffee Maker").description("12-cup programmable coffee maker")
                        .price(new BigDecimal("49.99")).imageUrl("/images/coffeemaker.jpg").stock(80)
                        .categoryId(home.getId()).build(),
                Product.builder().name("Non-Stick Pan Set").description("3-piece non-stick frying pan set")
                        .price(new BigDecimal("64.99")).imageUrl("/images/panset.jpg").stock(90)
                        .categoryId(home.getId()).build()
        ));

        log.info("Seeded {} categories and {} products.", 4, 10);
    }
}
