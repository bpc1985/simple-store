package com.simplestore.inventory;

import co.elastic.apm.attach.ElasticApmAttacher;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class InventoryServiceApplication {

    public static void main(String[] args) {
        ElasticApmAttacher.attach();
        SpringApplication.run(InventoryServiceApplication.class, args);
    }
}
