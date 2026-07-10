package com.simplestore.checkout.repository;

import com.simplestore.checkout.model.CheckoutSagaState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CheckoutSagaStateRepository extends JpaRepository<CheckoutSagaState, UUID> {
}
