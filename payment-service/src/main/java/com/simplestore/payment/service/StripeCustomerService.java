package com.simplestore.payment.service;

import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.param.CustomerCreateParams;
import com.simplestore.payment.model.PaymentAccount;
import com.simplestore.payment.repository.PaymentAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")
@RequiredArgsConstructor
@Slf4j
public class StripeCustomerService {

    private final PaymentAccountRepository paymentAccountRepository;

    /**
     * Returns existing Stripe customer ID or creates a new one.
     * Customer creation is lazy — only on first payment attempt.
     */
    @Transactional
    public String getOrCreateStripeCustomerId(String userId, String email) {
        PaymentAccount account = paymentAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Payment account not found for user: " + userId));

        if (account.getStripeCustomerId() != null) {
            return account.getStripeCustomerId();
        }

        try {
            CustomerCreateParams params = CustomerCreateParams.builder()
                    .setEmail(email)
                    .putMetadata("userId", userId)
                    .build();
            Customer customer = Customer.create(params);
            account.setStripeCustomerId(customer.getId());
            paymentAccountRepository.save(account);
            log.info("Created Stripe customer {} for user {}", customer.getId(), userId);
            return customer.getId();
        } catch (StripeException e) {
            log.error("Failed to create Stripe customer for user {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to create Stripe customer", e);
        }
    }

    /**
     * Retrieves an existing Stripe customer. Returns empty if not found.
     */
    public Optional<Customer> retrieveCustomer(String stripeCustomerId) {
        try {
            return Optional.of(Customer.retrieve(stripeCustomerId));
        } catch (StripeException e) {
            log.warn("Failed to retrieve Stripe customer {}: {}", stripeCustomerId, e.getMessage());
            return Optional.empty();
        }
    }
}
