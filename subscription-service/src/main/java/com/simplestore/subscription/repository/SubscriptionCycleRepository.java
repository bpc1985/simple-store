package com.simplestore.subscription.repository;

import com.simplestore.subscription.domain.CycleStatus;
import com.simplestore.subscription.domain.SubscriptionCycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionCycleRepository extends JpaRepository<SubscriptionCycle, String> {

    List<SubscriptionCycle> findBySubscriptionIdOrderByCycleNumberDesc(String subscriptionId);

    Optional<SubscriptionCycle> findBySubscriptionIdAndStatus(String subscriptionId, CycleStatus status);
}
