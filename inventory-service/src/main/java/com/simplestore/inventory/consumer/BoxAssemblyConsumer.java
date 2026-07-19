package com.simplestore.inventory.consumer;

import com.simplestore.common.event.BoxAssemblyRequestedEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.function.Consumer;

/**
 * Receives BoxAssemblyRequestedEvent after successful subscription payment.
 * Future: allocates stock for subscription box contents.
 */
@Component
@Slf4j
public class BoxAssemblyConsumer implements Consumer<BoxAssemblyRequestedEvent> {

    @Override
    public void accept(BoxAssemblyRequestedEvent event) {
        log.info("Received BoxAssemblyRequestedEvent: subscriptionId={}, userId={}, plan={}, cycle={}",
                event.subscriptionId(), event.userId(), event.planName(), event.cycleNumber());
        // TODO: Allocate stock for subscription box contents
    }
}
