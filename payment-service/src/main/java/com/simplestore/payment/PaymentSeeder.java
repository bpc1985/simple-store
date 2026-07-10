package com.simplestore.payment;

import com.simplestore.payment.model.PaymentAccount;
import com.simplestore.payment.repository.PaymentAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentSeeder implements CommandLineRunner {

    private final PaymentAccountRepository paymentAccountRepository;

    @Override
    public void run(String... args) {
        if (paymentAccountRepository.count() > 0) {
            log.info("Payment accounts already exist, skipping seed.");
            return;
        }

        log.info("Seeding payment accounts...");

        PaymentAccount user1 = PaymentAccount.builder()
                .userId("user1")
                .balance(new BigDecimal("5000.00"))
                .build();
        paymentAccountRepository.save(user1);

        PaymentAccount user2 = PaymentAccount.builder()
                .userId("user2")
                .balance(new BigDecimal("3000.00"))
                .build();
        paymentAccountRepository.save(user2);

        PaymentAccount admin = PaymentAccount.builder()
                .userId("admin")
                .balance(new BigDecimal("10000.00"))
                .build();
        paymentAccountRepository.save(admin);

        log.info("Seeded 3 payment accounts: user1=5000.00, user2=3000.00, admin=10000.00");
    }
}
