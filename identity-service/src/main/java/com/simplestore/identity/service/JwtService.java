package com.simplestore.identity.service;

import com.simplestore.identity.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
public class JwtService {

    private final JwtConfig jwtConfig;
    private final SecretKey signingKey;

    public JwtService(JwtConfig jwtConfig) {
        this.jwtConfig = jwtConfig;
        byte[] keyBytes = Base64.getDecoder().decode(jwtConfig.getSecret());
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(String userId, List<String> roles) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userId)
                .claim("roles", roles)
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtConfig.getExpiration()))
                .signWith(signingKey)
                .compact();
    }

    public String generateRefreshToken(String userId) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(userId)
                .claim("type", "refresh")
                .issuedAt(new Date(now))
                .expiration(new Date(now + jwtConfig.getRefreshExpiration()))
                .signWith(signingKey)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUserId(String token) {
        return parseClaims(token).getSubject();
    }

    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        return parseClaims(token).get("roles", List.class);
    }

    public long getExpiration() {
        return jwtConfig.getExpiration();
    }

    public long getRefreshExpiration() {
        return jwtConfig.getRefreshExpiration();
    }

    public Date getExpirationDate(String token) {
        return parseClaims(token).getExpiration();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
