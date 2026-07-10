package com.simplestore.identity;

import co.elastic.apm.attach.ElasticApmAttacher;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class IdentityServiceApplication {

    public static void main(String[] args) {
        ElasticApmAttacher.attach();
        SpringApplication.run(IdentityServiceApplication.class, args);
    }
}
