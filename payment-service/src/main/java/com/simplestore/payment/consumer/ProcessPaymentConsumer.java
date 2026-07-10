package com.simplestore.payment.consumer;

import com.simplestore.common.event.ProcessPaymentRequestedEvent;
import com.simplestore.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProcessPaymentConsumer {

    private final PaymentService paymentService;

    @Bean
    public Consumer<ProcessPaymentRequestedEvent> processPaymentConsumer() {
        return event -> {
            log.info("Received ProcessPaymentRequestedEvent: correlationId={}", event.correlationId());
            paymentService.processPayment(event);
        };
    }
}
