package com.simplestore.payment.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.common.dto.PagedResult;
import com.simplestore.payment.dto.DepositRequest;
import com.simplestore.payment.dto.PaymentAccountDto;
import com.simplestore.payment.model.PaymentTransaction;
import com.simplestore.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Payments", description = "Payment accounts and transactions")
@RestController
@RequestMapping("/api/v1/payment")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Get account", description = "Returns payment account details (admin only)")
    @GetMapping("/accounts/{userId}")
    public ApiResponse<PaymentAccountDto> getAccount(@PathVariable String userId) {
        PaymentAccountDto account = paymentService.getAccount(userId);
        return ApiResponse.ok(account);
    }

    @Operation(summary = "Deposit", description = "Deposits funds into a payment account (admin only)")
    @PostMapping("/accounts/{userId}/deposit")
    public ApiResponse<PaymentAccountDto> deposit(@PathVariable String userId,
                                                   @RequestBody @Valid DepositRequest request) {
        PaymentAccountDto account = paymentService.deposit(userId, request.amount());
        return ApiResponse.ok(account);
    }

    @Operation(summary = "List transactions", description = "Returns paginated list of all payment transactions (admin only)")
    @GetMapping("/transactions")
    public ApiResponse<PagedResult<PaymentTransaction>> getTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        PagedResult<PaymentTransaction> result = paymentService.getTransactions(page, pageSize);
        return ApiResponse.ok(result);
    }
}
