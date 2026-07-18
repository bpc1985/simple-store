package com.simplestore.payment.consumer;

import com.simplestore.common.event.SubscriptionCycleStartedEvent;
import com.simplestore.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionCycleChargeConsumer implements Consumer<SubscriptionCycleStartedEvent> {

    private final PaymentService paymentService;

    @Override
    public void accept(SubscriptionCycleStartedEvent event) {
        log.info("Received subscription cycle: subscriptionId={}, cycle={}, amount={}",
                event.subscriptionId(), event.cycleNumber(), event.amount());
        paymentService.processSubscriptionPayment(event);
    }
}
