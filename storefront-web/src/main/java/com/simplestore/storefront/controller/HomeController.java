package com.simplestore.storefront.controller;

import com.simplestore.storefront.service.CatalogClientService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class HomeController {

    private final CatalogClientService catalogClientService;

    public HomeController(CatalogClientService catalogClientService) {
        this.catalogClientService = catalogClientService;
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("products", catalogClientService.getProducts(0, null, null));
        model.addAttribute("categories", catalogClientService.getCategories());
        return "home";
    }

    @GetMapping("/products")
    public String products(@RequestParam(defaultValue = "0") int page,
                           @RequestParam(required = false) String category,
                           @RequestParam(required = false) String search,
                           Model model) {
        model.addAttribute("products", catalogClientService.getProducts(page, category, search));
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
}
