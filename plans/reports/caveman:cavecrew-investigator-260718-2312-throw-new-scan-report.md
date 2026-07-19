# throw new Scan Report

Scanned 7 service source dirs for `throw new` statements.

## Results by service

### catalog-service
No `throw new` statements. (14 Java files scanned)

### order-service
- `order-service/.../order/service/OrderService.java:97` — `RuntimeException` — "Access denied"
- `order-service/.../order/service/OrderService.java:107` — `RuntimeException` — "Access denied"
- `order-service/.../order/service/OrderService.java:110` — `RuntimeException` — "Only pending orders can be cancelled"

### inventory-service
No `throw new` statements. (16 Java files scanned)

### payment-service
No `throw new` statements. (15 Java files scanned)

### subscription-service
- `subscription-service/.../subscription/service/SubscriptionService.java:70` — `IllegalStateException` — "Plan is not active: " + plan.getName()
- `subscription-service/.../subscription/service/SubscriptionService.java:79` — `IllegalStateException` — "Already subscribed to this plan"
- `subscription-service/.../subscription/service/SubscriptionService.java:126` — `AccessDeniedException` — "Not your subscription"
- `subscription-service/.../subscription/service/SubscriptionService.java:156` — `AccessDeniedException` — "Not your subscription"
- `subscription-service/.../subscription/service/SubscriptionService.java:161` — `IllegalStateException` — "Cannot cancel subscription in " + sub.getStatus() + " status"
- `subscription-service/.../subscription/service/SubscriptionService.java:173` — `AccessDeniedException` — "Not your subscription"
- `subscription-service/.../subscription/service/SubscriptionService.java:176` — `IllegalStateException` — "Cannot pause subscription in " + sub.getStatus() + " status"
- `subscription-service/.../subscription/service/SubscriptionService.java:188` — `AccessDeniedException` — "Not your subscription"
- `subscription-service/.../subscription/service/SubscriptionService.java:192` — `IllegalStateException` — "Cannot resume subscription in " + sub.getStatus() + " status"
- `subscription-service/.../subscription/service/SubscriptionService.java:346` — `AccessDeniedException` — "Not your subscription"
- `subscription-service/.../subscription/service/SubscriptionService.java:421` — `IllegalStateException` — "Cannot cancel subscription in " + sub.getStatus() + " status"
- `subscription-service/.../subscription/service/SubscriptionService.java:430` — `IllegalArgumentException` — "Subscription not found: " + subscriptionId

### checkout-service
No `throw new` statements. (6 Java files scanned)

### cart-service
- `cart-service/.../cart/controller/CartController.java:56` — `IllegalArgumentException` — "productId is required"
- `cart-service/.../cart/service/RedisCartService.java:80` — `RuntimeException` — "Failed to serialize cart item" (cause e)
- `cart-service/.../cart/service/RedisCartService.java:105` — `RuntimeException` — "Failed to update cart item" (cause e)

## Totals
- catalog-service: 0
- order-service: 3
- inventory-service: 0
- payment-service: 0
- subscription-service: 12
- checkout-service: 0
- cart-service: 3

Total: 18 throw new statements across 3 of 7 services.

## Notes
- `AccessDeniedException` in subscription-service is `org.springframework.security.access.AccessDeniedException` (Spring Security), not a custom exception.
- order-service and cart-service use generic `RuntimeException`; subscription uses `IllegalStateException`/`IllegalArgumentException`/`AccessDeniedException`.
- No multi-line `throw new` message continuations found.
