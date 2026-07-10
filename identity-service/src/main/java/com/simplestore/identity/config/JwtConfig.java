package com.simplestore.identity.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "jwt")
public class JwtConfig {

    private String secret;
    private long expiration;
    private long refreshExpiration;
}
