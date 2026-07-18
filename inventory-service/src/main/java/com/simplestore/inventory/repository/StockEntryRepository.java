package com.simplestore.inventory.repository;

import com.simplestore.inventory.domain.StockEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface StockEntryRepository extends JpaRepository<StockEntry, Long> {

    Optional<StockEntry> findByProductId(int productId);

    List<StockEntry> findByProductIdIn(Set<Integer> productIds);
}
