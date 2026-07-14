package com.simplestore.storefront.controller;

import com.simplestore.storefront.service.CatalogClientService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Controller
public class HomeController {

    private final CatalogClientService catalogClientService;

    public HomeController(CatalogClientService catalogClientService) {
        this.catalogClientService = catalogClientService;
    }

    @GetMapping("/")
    public String home(Model model) {
        Map<String, Object> result = catalogClientService.getProducts(0, null, null);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> products = (List<Map<String, Object>>) result.getOrDefault("items", Collections.emptyList());
        model.addAttribute("featuredProducts", products);
        model.addAttribute("categories", catalogClientService.getCategories());
        return "home";
    }

    @GetMapping("/products")
    public String products(@RequestParam(defaultValue = "0") int page,
                           @RequestParam(required = false) String category,
                           @RequestParam(required = false) String search,
                           Model model) {
        String categoryId = resolveCategoryId(category);
        Map<String, Object> result = catalogClientService.getProducts(page, categoryId, search);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> products = (List<Map<String, Object>>) result.getOrDefault("items", Collections.emptyList());
        model.addAttribute("products", products);
        model.addAttribute("categories", catalogClientService.getCategories());
        model.addAttribute("currentPage", page);
        model.addAttribute("selectedCategory", category);
        model.addAttribute("searchTerm", search);
        return "products";
    }

    @GetMapping("/products/{id}")
    public String productDetail(@PathVariable Long id, Model model) {
        model.addAttribute("product", catalogClientService.getProduct(id));
        return "product-detail";
    }

    /** Maps category name to its database ID by looking up the categories list. */
    private String resolveCategoryId(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return null;
        }
        List<Map<String, Object>> categories = catalogClientService.getCategories();
        for (Map<String, Object> cat : categories) {
            if (categoryName.equals(cat.get("name"))) {
                return String.valueOf(cat.get("id"));
            }
        }
        // ponytail: fall back to passing the name as-is — backend returns empty results for unknown ID
        return "-1";
    }
}
