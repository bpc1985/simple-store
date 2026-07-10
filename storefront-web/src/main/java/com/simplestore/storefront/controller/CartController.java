package com.simplestore.storefront.controller;

import com.simplestore.storefront.dto.CartDto;
import com.simplestore.storefront.service.CartClientService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@Controller
@RequestMapping("/cart")
public class CartController {

    private static final String CART_ID_ATTR = "cartId";

    private final CartClientService cartClientService;

    public CartController(CartClientService cartClientService) {
        this.cartClientService = cartClientService;
    }

    @GetMapping
    public String viewCart(HttpSession session, Model model) {
        String cartId = getOrCreateCartId(session);
        CartDto cart = cartClientService.getCart(cartId);
        model.addAttribute("cart", cart);
        return "cart";
    }

    @PostMapping("/add/{productId}")
    public String addToCart(@PathVariable Long productId,
                            @RequestParam(defaultValue = "1") int quantity,
                            HttpSession session) {
        String cartId = getOrCreateCartId(session);
        cartClientService.addToCart(productId, quantity, cartId);
        return "redirect:/cart";
    }

    @PostMapping("/update/{productId}")
    public String updateCartItem(@PathVariable Long productId,
                                 @RequestParam int quantity,
                                 HttpSession session) {
        String cartId = getOrCreateCartId(session);
        cartClientService.updateCartItem(productId, quantity, cartId);
        return "redirect:/cart";
    }

    @PostMapping("/remove/{productId}")
    public String removeCartItem(@PathVariable Long productId,
                                 HttpSession session) {
        String cartId = getOrCreateCartId(session);
        cartClientService.removeCartItem(productId, cartId);
        return "redirect:/cart";
    }

    @PostMapping("/clear")
    public String clearCart(HttpSession session) {
        String cartId = (String) session.getAttribute(CART_ID_ATTR);
        if (cartId != null) {
            cartClientService.clearCart(cartId);
        }
        session.removeAttribute(CART_ID_ATTR);
        return "redirect:/cart";
    }

    private String getOrCreateCartId(HttpSession session) {
        String cartId = (String) session.getAttribute(CART_ID_ATTR);
        if (cartId == null || cartId.isBlank()) {
            cartId = UUID.randomUUID().toString();
            session.setAttribute(CART_ID_ATTR, cartId);
        }
        return cartId;
    }
}
