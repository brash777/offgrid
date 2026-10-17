package com.flowstore.backend.order;

import com.flowstore.backend.auth.AuthenticatedUser;
import com.flowstore.backend.shared.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@Tag(name = "Orders")
public class OrderController {

    private static final int MAX_PAGE_SIZE = 50;

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Turn the cart into an order and pay it with a simulated card",
            description = "An approved payment marks the order as PAID, stores SALE stock movements and empties the cart. "
                    + "A rejected payment keeps the order as CANCELLED and touches neither the stock nor the cart.")
    public OrderDtos.OrderResponse checkout(@AuthenticationPrincipal AuthenticatedUser user,
                                            @Valid @RequestBody OrderDtos.CheckoutRequest request) {
        return orderService.checkout(user.id(), request);
    }

    @GetMapping
    @Operation(summary = "Order history of the authenticated user, newest first")
    public PageResponse<OrderDtos.OrderResponse> listOrders(@AuthenticationPrincipal AuthenticatedUser user,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "10") int size) {
        return orderService.listOrders(user.id(), Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get one order of the authenticated user (another user's order answers 404)")
    public OrderDtos.OrderResponse getOrder(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        return orderService.getOrder(user.id(), id);
    }
}
