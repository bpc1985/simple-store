package com.simplestore.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("SimpleStore API")
                        .description("""
                                A production-grade microservices e-commerce platform.
                                
                                ## Authentication
                                Most endpoints require a JWT Bearer token. Obtain one via:
                                - `POST /api/v1/identity/register` — create account
                                - `POST /api/v1/identity/login` — get access + refresh tokens
                                
                                Include the token in requests as: `Authorization: Bearer <token>`
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("SimpleStore Team")
                                .email("team@simplestore.com"))
                        .license(new License()
                                .name("MIT")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Gateway"),
                        new Server().url("/").description("Direct")
                ))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter your JWT token")));
    }
}
