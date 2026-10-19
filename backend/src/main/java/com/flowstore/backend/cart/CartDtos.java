package com.flowstore.backend.cart;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class CartDtos {

    private CartDtos() {
    }

    @Schema(description = "Variant and number of units to add to the cart")
    public record AddItemRequest(

            @NotNull(message = "{validation.variant.required}")
            UUID variantId,

            @NotNull(message = "{validation.quantity.required}")
            @Min(value = 1, message = "{validation.quantity.positive}")
            @Max(value = CartService.MAX_UNITS_PER_LINE, message = "{validation.quantity.max}")
            Integer quantity
    ) {
    }

    @Schema(description = "New number of units for a cart line")
    public record UpdateItemRequest(

            @NotNull(message = "{validation.quantity.required}")
            @Min(value = 1, message = "{validation.quantity.positive}")
            @Max(value = CartService.MAX_UNITS_PER_LINE, message = "{validation.quantity.max}")
            Integer quantity
    ) {
    }

    @Schema(description = "Cart line with the current price and the available stock")
    public record CartItemResponse(
            UUID variantId,
            UUID productId,
            String productName,
            String categorySlug,
            String size,
            String colorName,
            String colorHex,
            String thumbnailUrl,
            String photoColor,
            String photoColorHex,
            BigDecimal unitPrice,
            int quantity,
            long available,
            BigDecimal lineTotal
    ) {
    }

    @Schema(description = "Cart of the authenticated user; the subtotal is always calculated from its lines")
    public record CartResponse(
            List<CartItemResponse> items,
            int itemCount,
            BigDecimal subtotal,
            int maxUnitsPerLine
    ) {
    }
}
