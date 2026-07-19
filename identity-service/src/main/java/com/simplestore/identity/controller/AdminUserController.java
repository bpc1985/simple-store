package com.simplestore.identity.controller;

import com.simplestore.common.dto.ApiResponse;
import com.simplestore.common.dto.PagedResult;
import com.simplestore.identity.dto.UserDto;
import com.simplestore.identity.service.IdentityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Admin Users", description = "User management (admin only)")
@RestController
@RequestMapping("/api/v1/identity/admin")
public class AdminUserController {

    private final IdentityService identityService;

    public AdminUserController(IdentityService identityService) {
        this.identityService = identityService;
    }

    @Operation(summary = "List users", description = "Returns paginated list of all registered users")
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PagedResult<UserDto>>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        PagedResult<UserDto> users = identityService.getUsers(page, pageSize);
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @Operation(summary = "Count users", description = "Returns total number of registered users")
    @GetMapping("/users/count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUserCount() {
        PagedResult<UserDto> users = identityService.getUsers(0, 1);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("count", users.getTotalCount())));
    }

    @Operation(summary = "Update user", description = "Updates a user's full name")
    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String fullName = body.get("fullName");
        UserDto user = identityService.updateUser(id, fullName);
        return ResponseEntity.ok(ApiResponse.ok("User updated", user));
    }

    @Operation(summary = "Lock user", description = "Locks a user account, preventing login")
    @PostMapping("/users/{id}/lock")
    public ResponseEntity<ApiResponse<Void>> lockUser(@PathVariable String id) {
        identityService.lockUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User locked", null));
    }

    @Operation(summary = "Unlock user", description = "Unlocks a previously locked user account")
    @PostMapping("/users/{id}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlockUser(@PathVariable String id) {
        identityService.unlockUser(id);
        return ResponseEntity.ok(ApiResponse.ok("User unlocked", null));
    }
}
