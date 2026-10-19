package com.flowstore.backend.order;

import com.flowstore.backend.cart.Cart;
import com.flowstore.backend.cart.CartRepository;
import com.flowstore.backend.catalog.Category;
import com.flowstore.backend.catalog.EquipSlot;
import com.flowstore.backend.catalog.Product;
import com.flowstore.backend.catalog.ProductVariant;
import com.flowstore.backend.payment.CardDetails;
import com.flowstore.backend.payment.Payment;
import com.flowstore.backend.payment.PaymentRepository;
import com.flowstore.backend.payment.PaymentSimulator;
import com.flowstore.backend.payment.PaymentStatus;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.stock.StockService;
import com.flowstore.backend.user.User;
import com.flowstore.backend.user.UserRepository;
import com.flowstore.backend.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final CardDetails APPROVED_CARD = new CardDetails("Ana Prueba", "4242 4242 4242 4242", "12/29", "123");
    private static final CardDetails DECLINED_CARD = new CardDetails("Ana Prueba", "4000 0000 0000 0002", "12/29", "123");

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StockService stockService;

    @Mock
    private PaymentRepository paymentRepository;

    private OrderService orderService;
    private UUID userId;
    private User user;
    private Cart cart;
    private ProductVariant hoodie;
    private ProductVariant cap;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-17T15:00:00Z"), ZoneId.of("America/Bogota"));
        orderService = new OrderService(orderRepository, orderItemRepository, cartRepository, userRepository,
                stockService, paymentRepository, new PaymentSimulator(clock), clock);

        userId = UUID.randomUUID();
        user = new User("ana@flowstore.app", "hash", "Ana Prueba", UserRole.CUSTOMER);
        ReflectionTestUtils.setField(user, "id", userId);

        Category category = new Category("chaquetas", "Chaquetas");
        Product hoodieProduct = new Product(category, "Hoodie Neón", "", new BigDecimal("120000.00"), EquipSlot.TORSO);
        Product capProduct = new Product(category, "Gorra Clásica", "", new BigDecimal("45000.00"), EquipSlot.HEAD);
        hoodie = variant(hoodieProduct, "M", "Negro", null);
        cap = variant(capProduct, "Única", "Blanco", new BigDecimal("39900.00"));

        cart = new Cart(user);
        cart.put(hoodie, 2);
        cart.put(cap, 1);
    }

    @Test
    void checkoutTurnsTheCartIntoAPaidOrderWithFrozenPricesAndATotalFromItsLines() {
        givenTheCart();

        OrderDtos.OrderResponse order = orderService.checkout(userId, new OrderDtos.CheckoutRequest(APPROVED_CARD));

        assertThat(order.status()).isEqualTo(OrderStatus.PAID);
        assertThat(order.total()).isEqualByComparingTo("279900.00");
        assertThat(order.itemCount()).isEqualTo(3);
        assertThat(order.items())
                .extracting(OrderDtos.OrderLineResponse::productName, OrderDtos.OrderLineResponse::variantLabel,
                        OrderDtos.OrderLineResponse::unitPrice, OrderDtos.OrderLineResponse::quantity)
                .containsExactlyInAnyOrder(
                        tuple("Hoodie Neón", "M · Negro", new BigDecimal("120000.00"), 2),
                        tuple("Gorra Clásica", "Única · Blanco", new BigDecimal("39900.00"), 1));
        assertThat(order.payment().status()).isEqualTo(PaymentStatus.APPROVED);
        assertThat(order.payment().paidAt()).isNotNull();
        verify(stockService).registerSale(hoodie.getId(), 2, order.id());
        verify(stockService).registerSale(cap.getId(), 1, order.id());
        assertThat(cart.isEmpty()).isTrue();
    }

    @Test
    void aRejectedCardCancelsTheOrderWithoutTouchingStockOrTheCart() {
        givenTheCart();

        OrderDtos.OrderResponse order = orderService.checkout(userId, new OrderDtos.CheckoutRequest(DECLINED_CARD));

        assertThat(order.status()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.payment().status()).isEqualTo(PaymentStatus.REJECTED);
        assertThat(order.payment().paidAt()).isNull();
        verify(stockService, never()).registerSale(any(), anyInt(), any());
        assertThat(cart.getItems()).hasSize(2);
    }

    @Test
    void checkoutWithAnEmptyCartFails() {
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(new Cart(user)));

        assertThatThrownBy(() -> orderService.checkout(userId, new OrderDtos.CheckoutRequest(APPROVED_CARD)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CART_EMPTY"));
        verify(orderRepository, never()).saveAndFlush(any());
    }

    @Test
    void checkoutStopsWithoutPaymentWhenStockRunsOut() {
        givenTheCart();
        lenient().doThrow(ApiException.conflict("INSUFFICIENT_STOCK", "Hoodie Neón", "M", "Negro"))
                .when(stockService).registerSale(eq(hoodie.getId()), anyInt(), any());

        assertThatThrownBy(() -> orderService.checkout(userId, new OrderDtos.CheckoutRequest(APPROVED_CARD)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INSUFFICIENT_STOCK"));
        verify(paymentRepository, never()).save(any());
        assertThat(cart.getItems()).hasSize(2);
    }

    @Test
    void anOrderThatBelongsToAnotherUserIsNotFound() {
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findByIdAndUserId(orderId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orderService.getOrder(userId, orderId))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(error.getCode()).isEqualTo("ORDER_NOT_FOUND");
                });
    }

    @Test
    void thePaymentIsStoredWithoutCardData() {
        givenTheCart();

        orderService.checkout(userId, new OrderDtos.CheckoutRequest(APPROVED_CARD));

        ArgumentCaptor<Payment> payment = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(payment.capture());
        assertThat(payment.getValue().getMethod()).isEqualTo(Payment.SIMULATED_METHOD);
        assertThat(payment.getValue().toString()).doesNotContain("4242");
    }

    private void givenTheCart() {
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(orderRepository.saveAndFlush(any(CustomerOrder.class))).thenAnswer(invocation -> {
            CustomerOrder order = invocation.getArgument(0);
            ReflectionTestUtils.setField(order, "id", UUID.randomUUID());
            return order;
        });
    }

    private static ProductVariant variant(Product product, String size, String color, BigDecimal priceOverride) {
        ProductVariant variant = new ProductVariant(product, size, color, "#1a1a1a", "SKU-" + size + color, priceOverride);
        ReflectionTestUtils.setField(variant, "id", UUID.randomUUID());
        return variant;
    }
}
