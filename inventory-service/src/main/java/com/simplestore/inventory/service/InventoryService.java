package com.simplestore.inventory.service;

import com.simplestore.common.dto.PagedResult;
import com.simplestore.common.event.*;
import com.simplestore.inventory.domain.ReservationStatus;
import com.simplestore.inventory.domain.StockEntry;
import com.simplestore.inventory.domain.StockReservation;
import com.simplestore.inventory.domain.StockReservationItem;
import com.simplestore.inventory.dto.InventoryStatsDto;
import com.simplestore.inventory.dto.StockLevelDto;
import com.simplestore.inventory.repository.StockEntryRepository;
import com.simplestore.inventory.repository.StockReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final StockEntryRepository stockEntryRepository;
    private final StockReservationRepository stockReservationRepository;
    private final StreamBridge streamBridge;

    @Value("${app.inventory.low-stock-threshold:10}")
    private int lowStockThreshold;

    public PagedResult<StockLevelDto> getStockLevels(int page, int pageSize) {
        Page<StockEntry> entryPage = stockEntryRepository.findAll(PageRequest.of(page, pageSize));
        List<StockLevelDto> dtos = entryPage.getContent().stream()
                .map(e -> new StockLevelDto(e.getProductId(), e.getStockLevel()))
                .toList();
        PagedResult<StockLevelDto> result = new PagedResult<>();
        result.setItems(dtos);
        result.setPage(page);
        result.setPageSize(pageSize);
        result.setTotalCount(entryPage.getTotalElements());
        return result;
    }

    public StockLevelDto getStockLevel(int productId) {
        StockEntry entry = stockEntryRepository.findByProductId(productId)
                .orElseThrow(() -> new RuntimeException("Stock entry not found for product: " + productId));
        return new StockLevelDto(entry.getProductId(), entry.getStockLevel());
    }

    public long getStockCount() {
        return stockEntryRepository.count();
    }

    @Transactional
    public StockLevelDto updateStockLevel(int productId, int newLevel) {
        StockEntry entry = stockEntryRepository.findByProductId(productId)
                .orElseThrow(() -> new RuntimeException("Stock entry not found for product: " + productId));
        entry.setStockLevel(newLevel);
        entry.setUpdatedAt(Instant.now());
        stockEntryRepository.save(entry);

        StockLevelChangedEvent event = new StockLevelChangedEvent(
                (long) productId, newLevel);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                boolean sent = streamBridge.send("stock-level-changed", event);
                if (!sent) {
                    log.error("Failed to send stock-level-changed event for product {}", productId);
                }
            }
        });
        log.info("Stock level for product {} updated to {} and StockLevelChangedEvent published", productId, newLevel);

        return new StockLevelDto(entry.getProductId(), entry.getStockLevel());
    }

    public List<StockReservation> getReservations() {
        return stockReservationRepository.findAll();
    }

    public InventoryStatsDto getInventoryStats() {
        long totalProducts = stockEntryRepository.count();
        long totalReservations = stockReservationRepository.count();
        long lowStockCount = stockEntryRepository.countByStockLevelLessThan(lowStockThreshold);
        return new InventoryStatsDto(totalProducts, totalReservations, lowStockCount);
    }


    @Transactional
    public void processReserveStock(ReserveStockRequestedEvent event) {
        log.info("Processing ReserveStockRequestedEvent: correlationId={}, userId={}",
                event.correlationId(), event.userId());

        // Batch-fetch all stock entries for the requested products
        Set<Integer> productIds = event.items().stream()
                .map(item -> item.productId().intValue())
                .collect(Collectors.toSet());
        Map<Integer, StockEntry> entriesByProductId = stockEntryRepository.findByProductIdIn(productIds)
                .stream().collect(Collectors.toMap(StockEntry::getProductId, e -> e));

        // Validate all products exist and have sufficient stock
        for (ReserveStockRequestedEvent.StockItem item : event.items()) {
            StockEntry entry = entriesByProductId.get(item.productId().intValue());
            if (entry == null) {
                String reason = "Product not found: " + item.productId();
                log.warn("Stock reservation failed: {}", reason);
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        boolean sent = streamBridge.send("stock-reservation-failed",
                                new StockReservationFailedEvent(event.correlationId(), event.userId(), reason));
                        if (!sent) log.error("Failed to send stock-reservation-failed for correlationId={}", event.correlationId());
                    }
                });
                return;
            }

            if (entry.getStockLevel() < item.quantity()) {
                String reason = "Insufficient stock for product " + item.productId()
                        + ": requested " + item.quantity() + ", available " + entry.getStockLevel();
                log.warn("Stock reservation failed: {}", reason);
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        boolean sent = streamBridge.send("stock-reservation-failed",
                                new StockReservationFailedEvent(event.correlationId(), event.userId(), reason));
                        if (!sent) log.error("Failed to send stock-reservation-failed for correlationId={}", event.correlationId());
                    }
                });
                return;
            }
        }

        // All items have sufficient stock — deduct and create reservation
        // ponytail: orderId=0 — saga-driven, ReserveStockRequestedEvent has no order ID
        StockReservation reservation = StockReservation.builder()
                .orderId(0)
                .correlationId(event.correlationId())
                .status(ReservationStatus.RESERVED)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        for (ReserveStockRequestedEvent.StockItem item : event.items()) {
            StockEntry entry = entriesByProductId.get(item.productId().intValue());
            entry.setStockLevel(entry.getStockLevel() - item.quantity());
            entry.setUpdatedAt(Instant.now());

            // Publish stock level change for catalog cache synchronization
            StockLevelChangedEvent sle = new StockLevelChangedEvent(item.productId(), entry.getStockLevel());
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    boolean sent = streamBridge.send("stock-level-changed", sle);
                    if (!sent) log.error("Failed to send stock-level-changed for product {}", sle.productId());
                }
            });

            StockReservationItem reservationItem = StockReservationItem.builder()
                    .productId(item.productId().intValue())
                    .quantity(item.quantity())
                    .build();
            reservation.addItem(reservationItem);
        }

        stockEntryRepository.saveAll(entriesByProductId.values());
        stockReservationRepository.save(reservation);

        log.info("Stock reserved successfully for correlationId={}", event.correlationId());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                boolean sent = streamBridge.send("stock-reserved",
                        new StockReservedEvent(event.correlationId(), event.userId()));
                if (!sent) log.error("Failed to send stock-reserved for correlationId={}", event.correlationId());
            }
        });
    }

    @Transactional
    public void processCancelReservation(StockReservationCancelRequestedEvent event) {
        log.info("Processing StockReservationCancelRequestedEvent: correlationId={}",
                event.correlationId());

        StockReservation reservation = stockReservationRepository
                .findByCorrelationId(event.correlationId()).orElse(null);

        if (reservation == null) {
            log.warn("Reservation not found for correlationId={}", event.correlationId());
            return;
        }

        if (reservation.getStatus() != ReservationStatus.RESERVED) {
            log.warn("Reservation {} is not in RESERVED status, current status: {}",
                    event.correlationId(), reservation.getStatus());
            return;
        }

        // Restore stock for each item
        for (StockReservationItem item : reservation.getItems()) {
            StockEntry entry = stockEntryRepository.findByProductId(item.getProductId())
                    .orElseThrow(() -> new RuntimeException(
                            "Stock entry not found for product: " + item.getProductId()));
            entry.setStockLevel(entry.getStockLevel() + item.getQuantity());
            entry.setUpdatedAt(Instant.now());
            stockEntryRepository.save(entry);

            // Publish stock level change for catalog cache synchronization
            StockLevelChangedEvent sle = new StockLevelChangedEvent((long) item.getProductId(), entry.getStockLevel());
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    boolean sent = streamBridge.send("stock-level-changed", sle);
                    if (!sent) log.error("Failed to send stock-level-changed for product {}", sle.productId());
                }
            });
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setUpdatedAt(Instant.now());
        stockReservationRepository.save(reservation);

        log.info("Reservation cancelled for correlationId={}", event.correlationId());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                boolean sent = streamBridge.send("stock-reservation-cancelled",
                        new StockReservationCancelledEvent(event.correlationId(), event.userId()));
                if (!sent) log.error("Failed to send stock-reservation-cancelled for correlationId={}", event.correlationId());
            }
        });
    }
}
