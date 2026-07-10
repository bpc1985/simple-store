package com.simplestore.cart;

import co.elastic.apm.attach.ElasticApmAttacher;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CartServiceApplication {

    public static void main(String[] args) {
        ElasticApmAttacher.attach();
        SpringApplication.run(CartServiceApplication.class, args);
    }
}
