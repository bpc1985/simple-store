package com.simplestore.admin.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/admin/login", "/css/**", "/js/**").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/admin/login")
                .loginProcessingUrl("/admin/login")
                .defaultSuccessUrl("/admin", true)
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/admin/logout")
                .invalidateHttpSession(true)
                .logoutSuccessUrl("/admin/login")
                .permitAll()
            )
            .addFilterBefore(sessionSecurityContextFilter(), BasicAuthenticationFilter.class)
            .csrf(csrf -> csrf.disable());

        return http.build();
    }

    @Bean
    public OncePerRequestFilter sessionSecurityContextFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain filterChain)
                    throws ServletException, IOException {
                var session = request.getSession(false);
                if (session != null) {
                    SecurityContext context = (SecurityContext) session.getAttribute("SPRING_SECURITY_CONTEXT");
                    if (context != null) {
                        SecurityContextHolder.setContext(context);
                    }
                }
                try {
                    filterChain.doFilter(request, response);
                } finally {
                    SecurityContextHolder.clearContext();
                }
            }
        };
    }
}
