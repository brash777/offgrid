package com.flowstore.backend.cart;

import com.flowstore.backend.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cart")
@Tag(name = "Cart")
public class CartController {

    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping
    @Operation(summary = "Get the authenticated user's cart")
    public CartDtos.CartResponse getCart(@AuthenticationPrincipal AuthenticatedUser user) {
        return cartService.getCart(user.id());
    }

    @PostMapping("/items")
    @Operation(summary = "Add units of a variant to the cart (checks the available stock)")
    public CartDtos.CartResponse addItem(@AuthenticationPrincipal AuthenticatedUser user,
                                         @Valid @RequestBody CartDtos.AddItemRequest request) {
        return cartService.addItem(user.id(), request);
    }

    @PutMapping("/items/{variantId}")
    @Operation(summary = "Change the number of units of a cart line")
    public CartDtos.CartResponse updateItem(@AuthenticationPrincipal AuthenticatedUser user,
                                            @PathVariable UUID variantId,
                                            @Valid @RequestBody CartDtos.UpdateItemRequest request) {
        return cartService.updateItem(user.id(), variantId, request);
    }

    @DeleteMapping("/items/{variantId}")
    @Operation(summary = "Remove a line from the cart")
    public CartDtos.CartResponse removeItem(@AuthenticationPrincipal AuthenticatedUser user,
                                            @PathVariable UUID variantId) {
        return cartService.removeItem(user.id(), variantId);
    }
}
