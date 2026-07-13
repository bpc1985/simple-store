package com.simplestore.identity;

import com.simplestore.identity.model.ApplicationUser;
import com.simplestore.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

/**
 * Seeds admin + sample users on first startup.
 * Uses well-known UUIDs so other services (payment, order) can reference them.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class IdentitySeeder implements CommandLineRunner {

    public static final String ADMIN_ID = "00000000-0000-0000-0000-000000000001";
    public static final String USER1_ID = "00000000-0000-0000-0000-000000000002";
    public static final String USER2_ID = "00000000-0000-0000-0000-000000000003";
    public static final String USER3_ID = "00000000-0000-0000-0000-000000000004";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Users already exist, skipping identity seed.");
            return;
        }

        log.info("Seeding identity data...");
        var now = Instant.now();

        var admin = ApplicationUser.builder()
                .id(ADMIN_ID)
                .email("admin@store.com")
                .fullName("Admin User")
                .passwordHash(passwordEncoder.encode("Admin123!"))
                .roles(Arrays.asList("ROLE_ADMIN", "ROLE_USER"))
                .createdAt(now)
                .updatedAt(now)
                .locked(false)
                .build();

        var user1 = ApplicationUser.builder()
                .id(USER1_ID)
                .email("user1@store.com")
                .fullName("Alice Johnson")
                .passwordHash(passwordEncoder.encode("User123!"))
                .roles(Arrays.asList("ROLE_USER"))
                .createdAt(now)
                .updatedAt(now)
                .locked(false)
                .build();

        var user2 = ApplicationUser.builder()
                .id(USER2_ID)
                .email("user2@store.com")
                .fullName("Bob Williams")
                .passwordHash(passwordEncoder.encode("User123!"))
                .roles(Arrays.asList("ROLE_USER"))
                .createdAt(now)
                .updatedAt(now)
                .locked(false)
                .build();

        var user3 = ApplicationUser.builder()
                .id(USER3_ID)
                .email("user3@store.com")
                .fullName("Carol Smith")
                .passwordHash(passwordEncoder.encode("User123!"))
                .roles(Arrays.asList("ROLE_USER"))
                .createdAt(now)
                .updatedAt(now)
                .locked(false)
                .build();

        userRepository.saveAll(List.of(admin, user1, user2, user3));

        log.info("Seeded 4 users:");
        log.info("  admin@store.com / Admin123!  (ROLE_ADMIN)");
        log.info("  user1@store.com / User123!   (ROLE_USER)");
        log.info("  user2@store.com / User123!   (ROLE_USER)");
        log.info("  user3@store.com / User123!   (ROLE_USER)");
    }
}
