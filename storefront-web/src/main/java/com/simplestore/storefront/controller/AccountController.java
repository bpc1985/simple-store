package com.simplestore.storefront.controller;

import com.simplestore.storefront.dto.RegistrationForm;
import com.simplestore.storefront.dto.TokenResponse;
import com.simplestore.storefront.service.IdentityClientService;
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
@RequestMapping("/account")
public class AccountController {

    private static final String ACCESS_TOKEN_ATTR = "accessToken";
    private static final String REFRESH_TOKEN_ATTR = "refreshToken";

    private final IdentityClientService identityClientService;
    private final OrderClientService orderClientService;

    public AccountController(IdentityClientService identityClientService,
                             OrderClientService orderClientService) {
        this.identityClientService = identityClientService;
        this.orderClientService = orderClientService;
    }

    @GetMapping("/login")
    public String loginPage(HttpSession session) {
        if (session.getAttribute(ACCESS_TOKEN_ATTR) != null) {
            return "redirect:/";
        }
        return "login";
    }

    @GetMapping("/register")
    public String registerPage(HttpSession session, Model model) {
        if (session.getAttribute(ACCESS_TOKEN_ATTR) != null) {
            return "redirect:/";
        }
        model.addAttribute("registrationForm", new RegistrationForm());
        return "register";
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpSession session,
                        RedirectAttributes redirectAttributes) {
        try {
            TokenResponse tokenResponse = identityClientService.login(email, password);
            session.setAttribute(ACCESS_TOKEN_ATTR, tokenResponse.getAccessToken());
            session.setAttribute(REFRESH_TOKEN_ATTR, tokenResponse.getRefreshToken());
            // Set Spring Security context for the session
            session.setAttribute("SPRING_SECURITY_CONTEXT",
                    new org.springframework.security.core.context.SecurityContextImpl(
                            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                    email, null, List.of())));
            return "redirect:/";
        } catch (Exception e) {
            redirectAttributes.addAttribute("error", true);
            return "redirect:/account/login";
        }
    }

    @PostMapping("/register")
    public String register(@RequestParam String email,
                           @RequestParam String password,
                           @RequestParam String fullName,
                           HttpSession session) {
        try {
            TokenResponse tokenResponse = identityClientService.register(email, password, fullName);
            session.setAttribute(ACCESS_TOKEN_ATTR, tokenResponse.getAccessToken());
            session.setAttribute(REFRESH_TOKEN_ATTR, tokenResponse.getRefreshToken());
            session.setAttribute("SPRING_SECURITY_CONTEXT",
                    new org.springframework.security.core.context.SecurityContextImpl(
                            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                    email, null, List.of())));
            return "redirect:/";
        } catch (Exception e) {
            return "redirect:/account/register?error";
        }
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        String refreshToken = (String) session.getAttribute(REFRESH_TOKEN_ATTR);
        if (refreshToken != null) {
            try {
                identityClientService.logout(refreshToken);
            } catch (Exception ignored) {
                // Best-effort logout
            }
        }
        session.invalidate();
        return "redirect:/";
    }

    @GetMapping("/orders")
    public String orders(Model model) {
        List<Map<String, Object>> orders = orderClientService.getMyOrders();
        model.addAttribute("orders", orders);
        return "orders";
    }

    @GetMapping("/orders/{id}")
    public String orderDetail(@PathVariable Long id, Model model) {
        List<Map<String, Object>> orders = orderClientService.getMyOrders();
        Map<String, Object> order = orders.stream()
                .filter(o -> id.equals(o.get("id")))
                .findFirst()
                .orElse(null);
        model.addAttribute("order", order);
        return "order-detail";
    }
}
