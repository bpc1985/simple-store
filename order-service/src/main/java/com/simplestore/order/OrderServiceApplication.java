package com.simplestore.order;

import co.elastic.apm.attach.ElasticApmAttacher;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class OrderServiceApplication {

    public static void main(String[] args) {
        ElasticApmAttacher.attach();
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
