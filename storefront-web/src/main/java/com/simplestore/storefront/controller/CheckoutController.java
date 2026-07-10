package com.simplestore.storefront.controller;

import com.simplestore.storefront.dto.CartDto;
import com.simplestore.storefront.service.CartClientService;
import com.simplestore.storefront.service.OrderClientService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/checkout")
public class CheckoutController {

    private static final String CART_ID_ATTR = "cartId";

    private final CartClientService cartClientService;
    private final OrderClientService orderClientService;

    public CheckoutController(CartClientService cartClientService,
                              OrderClientService orderClientService) {
        this.cartClientService = cartClientService;
        this.orderClientService = orderClientService;
    }

    @GetMapping
    public String checkout(HttpSession session, Model model) {
        String cartId = (String) session.getAttribute(CART_ID_ATTR);
        CartDto cart = cartClientService.getCart(cartId);
        model.addAttribute("cart", cart);
        return "checkout";
    }

    @PostMapping
    public String placeOrder(@RequestParam String shippingAddress,
                             HttpSession session,
                             RedirectAttributes redirectAttributes) {
        String cartId = (String) session.getAttribute(CART_ID_ATTR);
        CartDto cart = cartClientService.getCart(cartId);

        if (cart == null || cart.getItems() == null || cart.getItems().isEmpty()) {
            redirectAttributes.addFlashAttribute("error", "Your cart is empty");
            return "redirect:/cart";
        }

        Map<String, Object> order = orderClientService.createOrder(shippingAddress, cart.getItems());

        // Clear the cart after successful order placement
        if (cartId != null) {
            try {
                cartClientService.clearCart(cartId);
            } catch (Exception ignored) {
                // Best-effort clear
            }
        }
        session.removeAttribute(CART_ID_ATTR);

        redirectAttributes.addFlashAttribute("order", order);
        Object orderId = order.get("id");
        return "redirect:/checkout/confirmation/" + orderId;
    }

    @GetMapping("/confirmation/{orderId}")
    public String orderConfirmation(@PathVariable Long orderId, Model model) {
        List<Map<String, Object>> orders = orderClientService.getMyOrders();
        Map<String, Object> order = orders.stream()
                .filter(o -> orderId.equals(o.get("id")))
                .findFirst()
                .orElse(null);
        model.addAttribute("order", order);
        return "order-confirmation";
    }
}
