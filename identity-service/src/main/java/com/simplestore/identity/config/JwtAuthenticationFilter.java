package com.simplestore.identity.config;

import com.simplestore.identity.service.JwtService;
import com.simplestore.identity.service.IdentityService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtService jwtService;
    private final IdentityService identityService;

    public JwtAuthenticationFilter(JwtService jwtService, IdentityService identityService) {
        this.jwtService = jwtService;
        this.identityService = identityService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        String userId;

        try {
            userId = jwtService.getUserId(token);
        } catch (Exception e) {
            log.debug("JWT parsing failed: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }

        if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = identityService.loadUserByUserId(userId);
                if (userDetails != null
                        && userDetails.isEnabled()
                        && userDetails.isAccountNonLocked()
                        && jwtService.validateToken(token)) {
                    // Use userId as principal (not UserDetails) so principal.getName()
                    // returns the UUID, which getUserInfo() uses to findById().
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userId, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            } catch (Exception e) {
                log.debug("Failed to authenticate user {}: {}", userId, e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}
