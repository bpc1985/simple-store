package com.simplestore.admin.controller;

import com.simplestore.admin.service.AdminClientService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private static final String ACCESS_TOKEN_ATTR = "accessToken";
    private static final String REFRESH_TOKEN_ATTR = "refreshToken";

    private final AdminClientService adminClientService;

    public AdminController(AdminClientService adminClientService) {
        this.adminClientService = adminClientService;
    }

    // --- Login / Logout ---

    @GetMapping("/login")
    public String loginPage(HttpSession session) {
        if (session.getAttribute(ACCESS_TOKEN_ATTR) != null) {
            return "redirect:/admin";
        }
        return "admin/login";
    }

    @PostMapping("/login")
    public String login(@RequestParam String email,
                        @RequestParam String password,
                        HttpSession session,
                        RedirectAttributes redirectAttributes) {
        try {
            Map<String, Object> tokenResponse = adminClientService.login(email, password);
            session.setAttribute(ACCESS_TOKEN_ATTR, tokenResponse.get("accessToken"));
            session.setAttribute(REFRESH_TOKEN_ATTR, tokenResponse.get("refreshToken"));

            // Set Spring Security context for the session
            session.setAttribute("SPRING_SECURITY_CONTEXT",
                    new org.springframework.security.core.context.SecurityContextImpl(
                            new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                                    email, null, List.of())));

            return "redirect:/admin";
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Invalid email or password");
            return "redirect:/admin/login";
        }
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/admin/login";
    }

    // --- Dashboard ---

    @GetMapping
    public String dashboard(Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        model.addAttribute("stats", Map.of(
                "totalOrders", 0, "totalRevenue", "0.00",
                "pendingOrders", 0, "confirmedOrders", 0));
        return "admin/dashboard";
    }

    // --- Products ---

    @GetMapping("/products")
    public String products(@RequestParam(defaultValue = "0") int page, Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            Map<String, Object> result = adminClientService.getProducts(page);
            model.addAttribute("products", result.getOrDefault("items", List.of()));
            model.addAttribute("currentPage", page);
            model.addAttribute("totalPages", result.containsKey("totalCount") ?
                    (int)Math.ceil(((Number)result.get("totalCount")).doubleValue() / 20) : 1);
        } catch (Exception e) {
            model.addAttribute("products", List.of());
            model.addAttribute("currentPage", 0);
            model.addAttribute("totalPages", 1);
            model.addAttribute("error", "Could not load products");
        }
        return "admin/products";
    }

    @GetMapping("/products/create")
    public String createProductForm(Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        model.addAttribute("product", new HashMap<String, Object>());
        model.addAttribute("isNew", true);
        return "admin/product-form";
    }

    @PostMapping("/products")
    public String createProduct(@RequestParam String name,
                                @RequestParam String description,
                                @RequestParam double price,
                                @RequestParam String imageUrl,
                                @RequestParam int stock,
                                @RequestParam Long categoryId,
                                RedirectAttributes redirectAttributes) {
        try {
            Map<String, Object> productData = new HashMap<>();
            productData.put("name", name);
            productData.put("description", description);
            productData.put("price", price);
            productData.put("imageUrl", imageUrl);
            productData.put("stock", stock);
            productData.put("categoryId", categoryId);
            adminClientService.createProduct(productData);
            redirectAttributes.addFlashAttribute("success", "Product created successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to create product");
        }
        return "redirect:/admin/products";
    }

    @GetMapping("/products/{id}/edit")
    public String editProductForm(@PathVariable Long id, Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            Map<String, Object> product = adminClientService.getProduct(id);
            model.addAttribute("product", product);
            model.addAttribute("isNew", false);
        } catch (Exception e) {
            model.addAttribute("error", "Could not load product");
            return "redirect:/admin/products";
        }
        return "admin/product-form";
    }

    @PostMapping("/products/{id}/edit")
    public String updateProduct(@PathVariable Long id,
                                @RequestParam String name,
                                @RequestParam String description,
                                @RequestParam double price,
                                @RequestParam String imageUrl,
                                @RequestParam int stock,
                                @RequestParam Long categoryId,
                                RedirectAttributes redirectAttributes) {
        try {
            Map<String, Object> productData = new HashMap<>();
            productData.put("name", name);
            productData.put("description", description);
            productData.put("price", price);
            productData.put("imageUrl", imageUrl);
            productData.put("stock", stock);
            productData.put("categoryId", categoryId);
            adminClientService.updateProduct(id, productData);
            redirectAttributes.addFlashAttribute("success", "Product updated successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to update product");
        }
        return "redirect:/admin/products";
    }

    @PostMapping("/products/{id}/delete")
    public String deleteProduct(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        try {
            adminClientService.deleteProduct(id);
            redirectAttributes.addFlashAttribute("success", "Product deleted successfully");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to delete product");
        }
        return "redirect:/admin/products";
    }

    // --- Categories ---

    @GetMapping("/categories")
    public String categories(Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            List<Map<String, Object>> categories = adminClientService.getCategories();
            model.addAttribute("categories", categories);
        } catch (Exception e) {
            model.addAttribute("categories", List.of());
            model.addAttribute("error", "Could not load categories");
        }
        return "admin/categories";
    }

    // --- Orders ---

    @GetMapping("/orders")
    public String orders(@RequestParam(defaultValue = "0") int page, Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            Map<String, Object> result = adminClientService.getOrders(page);
            model.addAttribute("orders", result.getOrDefault("items", List.of()));
            model.addAttribute("currentPage", page);
            model.addAttribute("totalPages", result.containsKey("totalCount") ?
                    (int)Math.ceil(((Number)result.get("totalCount")).doubleValue() / 20) : 1);
        } catch (Exception e) {
            model.addAttribute("orders", List.of());
            model.addAttribute("currentPage", 0);
            model.addAttribute("totalPages", 1);
            model.addAttribute("error", "Could not load orders");
        }
        return "admin/orders";
    }

    @GetMapping("/orders/{id}")
    public String orderDetail(@PathVariable Long id, Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            Map<String, Object> order = adminClientService.getOrder(id);
            model.addAttribute("order", order);
        } catch (Exception e) {
            model.addAttribute("error", "Could not load order");
            return "redirect:/admin/orders";
        }
        return "admin/order-detail";
    }

    @PostMapping("/orders/{id}/status")
    public String updateOrderStatus(@PathVariable Long id,
                                    @RequestParam String status,
                                    RedirectAttributes redirectAttributes) {
        try {
            adminClientService.updateOrderStatus(id, status);
            redirectAttributes.addFlashAttribute("success", "Order status updated to " + status);
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("error", "Failed to update order status");
        }
        return "redirect:/admin/orders/" + id;
    }

    // --- Users ---

    @GetMapping("/users")
    public String users(Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            Map<String, Object> result = adminClientService.getUsersPage();
            model.addAttribute("users", result.getOrDefault("items", List.of()));
        } catch (Exception e) {
            model.addAttribute("users", List.of());
            model.addAttribute("error", "Could not load users");
        }
        return "admin/users";
    }

    // --- Inventory ---

    @GetMapping("/inventory")
    public String inventory(Model model, HttpServletRequest request) {
        model.addAttribute("currentPath", request.getRequestURI());
        try {
            Map<String, Object> result = adminClientService.getStockLevels();
            model.addAttribute("stockLevels", result.getOrDefault("items", List.of()));
        } catch (Exception e) {
            model.addAttribute("stockLevels", List.of());
            model.addAttribute("error", "Could not load inventory data");
        }
        return "admin/inventory";
    }

}
