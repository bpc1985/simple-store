package com.simplestore.payment.config;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // Try "roles" claim
        Object rolesObj = jwt.getClaims().get("roles");
        if (rolesObj instanceof List<?> roles) {
            for (Object role : roles) {
                String roleStr = role.toString().toUpperCase();
                if (!roleStr.startsWith("ROLE_")) {
                    roleStr = "ROLE_" + roleStr;
                }
                authorities.add(new SimpleGrantedAuthority(roleStr));
            }
        }

        // Try "role" claim (single)
        Object roleObj = jwt.getClaims().get("role");
        if (roleObj instanceof String roleStr) {
            String normalized = roleStr.toUpperCase();
            if (!normalized.startsWith("ROLE_")) {
                normalized = "ROLE_" + normalized;
            }
            authorities.add(new SimpleGrantedAuthority(normalized));
        }

        // Try realm_access roles (Keycloak-style)
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List<?> realmRoles) {
            for (Object r : realmRoles) {
                String roleStr = r.toString().toUpperCase();
                if (!roleStr.startsWith("ROLE_")) {
                    roleStr = "ROLE_" + roleStr;
                }
                authorities.add(new SimpleGrantedAuthority(roleStr));
            }
        }

        return authorities;
    }
}
