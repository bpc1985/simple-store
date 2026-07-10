package com.simplestore.payment.repository;

import com.simplestore.payment.model.PaymentAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentAccountRepository extends JpaRepository<PaymentAccount, UUID> {
    Optional<PaymentAccount> findByUserId(String userId);
}
