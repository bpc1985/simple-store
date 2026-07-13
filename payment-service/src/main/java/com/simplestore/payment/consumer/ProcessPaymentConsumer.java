package com.simplestore.payment.consumer;

import com.simplestore.common.event.ProcessPaymentRequestedEvent;
import com.simplestore.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProcessPaymentConsumer implements Consumer<ProcessPaymentRequestedEvent> {

    private final PaymentService paymentService;

    @Override
    public void accept(ProcessPaymentRequestedEvent event) {
        log.info("Received ProcessPaymentRequestedEvent: correlationId={}", event.correlationId());
        paymentService.processPayment(event);
    }
}
