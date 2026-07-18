package com.simplestore.subscription.repository;

import com.simplestore.subscription.domain.CustomerSubscription;
import com.simplestore.subscription.domain.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerSubscriptionRepository extends JpaRepository<CustomerSubscription, String> {

    List<CustomerSubscription> findByUserId(String userId);

    List<CustomerSubscription> findByUserIdAndPlanId(String userId, Long planId);

    List<CustomerSubscription> findByUserIdAndPlanIdAndStatus(String userId, Long planId, SubscriptionStatus status);

    /**
     * Find ACTIVE subscriptions whose next billing date is today or earlier.
     * Used by the scheduler to find cycles due for processing.
     */
    List<CustomerSubscription> findByStatusAndNextBillingDateBefore(SubscriptionStatus status, LocalDate cutoff);

    long countByUserId(String userId);

    List<CustomerSubscription> findByStatus(SubscriptionStatus status);

    List<CustomerSubscription> findByStatusAndUserId(SubscriptionStatus status, String userId);

    @Query(value = "SELECT pg_try_advisory_lock(42)", nativeQuery = true)
    boolean tryAcquireSchedulerLock();

    @Query(value = "SELECT pg_advisory_unlock(42)", nativeQuery = true)
    void releaseSchedulerLock();
}
