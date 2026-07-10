package com.simplestore.payment.service;

import com.simplestore.common.dto.PagedResult;
import com.simplestore.common.event.PaymentFailedEvent;
import com.simplestore.common.event.PaymentSucceededEvent;
import com.simplestore.common.event.ProcessPaymentRequestedEvent;
import com.simplestore.payment.dto.PaymentAccountDto;
import com.simplestore.payment.model.PaymentAccount;
import com.simplestore.payment.model.PaymentTransaction;
import com.simplestore.payment.model.TransactionStatus;
import com.simplestore.payment.model.TransactionType;
import com.simplestore.payment.repository.PaymentAccountRepository;
import com.simplestore.payment.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.stream.function.StreamBridge;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentAccountRepository paymentAccountRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final StreamBridge streamBridge;

    private PaymentAccount findOrCreateAccount(String userId) {
        return paymentAccountRepository.findByUserId(userId)
                .orElseGet(() -> {
                    PaymentAccount account = PaymentAccount.builder()
                            .userId(userId)
                            .balance(BigDecimal.ZERO)
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    return paymentAccountRepository.save(account);
                });
    }

    @Transactional
    public void processPayment(ProcessPaymentRequestedEvent event) {
        log.info("Processing payment for correlationId={}, userId={}, amount={}",
                event.correlationId(), event.userId(), event.amount());

        PaymentAccount account = findOrCreateAccount(event.userId());

        PaymentTransaction transaction = PaymentTransaction.builder()
                .correlationId(event.correlationId())
                .userId(event.userId())
                .amount(event.amount())
                .type(TransactionType.CHARGE)
                .status(TransactionStatus.PENDING)
                .createdAt(Instant.now())
                .build();

        if (account.getBalance().compareTo(event.amount()) >= 0) {
            // Sufficient funds
            account.setBalance(account.getBalance().subtract(event.amount()));
            account.setUpdatedAt(Instant.now());
            transaction.setStatus(TransactionStatus.SUCCEEDED);

            paymentAccountRepository.save(account);
            paymentTransactionRepository.save(transaction);

            log.info("Payment succeeded for correlationId={}, userId={}, new balance={}",
                    event.correlationId(), event.userId(), account.getBalance());

            streamBridge.send("payment-succeeded",
                    new PaymentSucceededEvent(event.correlationId(), event.userId()));
        } else {
            // Insufficient funds
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setReason("Insufficient funds");
            paymentTransactionRepository.save(transaction);

            log.warn("Payment failed for correlationId={}, userId={}, reason: Insufficient funds",
                    event.correlationId(), event.userId());

            streamBridge.send("payment-failed",
                    new PaymentFailedEvent(event.correlationId(), event.userId(), "Insufficient funds"));
        }
    }

    public PaymentAccountDto getAccount(String userId) {
        PaymentAccount account = paymentAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Payment account not found for user: " + userId));
        return new PaymentAccountDto(account.getId(), account.getUserId(), account.getBalance());
    }

    @Transactional
    public PaymentAccountDto deposit(String userId, BigDecimal amount) {
        PaymentAccount account = findOrCreateAccount(userId);
        account.setBalance(account.getBalance().add(amount));
        account.setUpdatedAt(Instant.now());
        paymentAccountRepository.save(account);

        log.info("Deposited {} to user={}, new balance={}", amount, userId, account.getBalance());
        return new PaymentAccountDto(account.getId(), account.getUserId(), account.getBalance());
    }

    public PagedResult<PaymentTransaction> getTransactions(int page, int pageSize) {
        var pageResult = paymentTransactionRepository.findAll(PageRequest.of(page, pageSize));
        PagedResult<PaymentTransaction> result = new PagedResult<>();
        result.setItems(pageResult.getContent());
        result.setPage(page);
        result.setPageSize(pageSize);
        result.setTotalCount(pageResult.getTotalElements());
        return result;
    }
}
