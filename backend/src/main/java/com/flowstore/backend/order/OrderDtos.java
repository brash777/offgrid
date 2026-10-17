package com.flowstore.backend.order;

import com.flowstore.backend.payment.CardDetails;
import com.flowstore.backend.payment.PaymentStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {

    private OrderDtos() {
    }

    @Schema(description = "Checkout of the current cart with a simulated card")
    public record CheckoutRequest(

            @NotNull(message = "{validation.payment.required}")
            @Valid
            CardDetails payment
    ) {
    }

    @Schema(description = "Order line with the name and price frozen at purchase time")
    public record OrderLineResponse(
            UUID variantId,
            UUID productId,
            String productName,
            String variantLabel,
            String categorySlug,
            String colorHex,
            BigDecimal unitPrice,
            int quantity,
            BigDecimal lineTotal
    ) {
    }

    @Schema(description = "Simulated payment of an order")
    public record PaymentResponse(String method, PaymentStatus status, OffsetDateTime paidAt) {
    }

    @Schema(description = "Order of the authenticated user; the total is always calculated from its lines")
    public record OrderResponse(
            UUID id,
            OrderStatus status,
            OffsetDateTime createdAt,
            List<OrderLineResponse> items,
            int itemCount,
            BigDecimal total,
            PaymentResponse payment
    ) {
    }
}
