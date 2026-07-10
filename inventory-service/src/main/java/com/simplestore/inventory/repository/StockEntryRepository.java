package com.simplestore.inventory.repository;

import com.simplestore.inventory.domain.StockEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StockEntryRepository extends JpaRepository<StockEntry, Long> {

    Optional<StockEntry> findByProductId(int productId);
}
