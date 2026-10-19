package com.flowstore.backend.order;

import com.flowstore.backend.cart.Cart;
import com.flowstore.backend.cart.CartItem;
import com.flowstore.backend.cart.CartRepository;
import com.flowstore.backend.catalog.ProductPhotos;
import com.flowstore.backend.catalog.ProductVariant;
import com.flowstore.backend.payment.Payment;
import com.flowstore.backend.payment.PaymentRepository;
import com.flowstore.backend.payment.PaymentSimulator;
import com.flowstore.backend.payment.PaymentStatus;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.shared.PageResponse;
import com.flowstore.backend.stock.StockService;
import com.flowstore.backend.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final UserRepository userRepository;
    private final StockService stockService;
    private final PaymentRepository paymentRepository;
    private final PaymentSimulator paymentSimulator;
    private final ProductPhotos productPhotos;
    private final Clock clock;

    public OrderService(OrderRepository orderRepository,
                        OrderItemRepository orderItemRepository,
                        CartRepository cartRepository,
                        UserRepository userRepository,
                        StockService stockService,
                        PaymentRepository paymentRepository,
                        PaymentSimulator paymentSimulator,
                        ProductPhotos productPhotos,
                        Clock clock) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.cartRepository = cartRepository;
        this.userRepository = userRepository;
        this.stockService = stockService;
        this.paymentRepository = paymentRepository;
        this.paymentSimulator = paymentSimulator;
        this.productPhotos = productPhotos;
        this.clock = clock;
    }

    @Transactional
    public OrderDtos.OrderResponse checkout(UUID userId, OrderDtos.CheckoutRequest request) {
        PaymentStatus decision = paymentSimulator.decide(request.payment());
        Cart cart = cartRepository.findByUserId(userId)
                .filter(found -> !found.isEmpty())
                .orElseThrow(() -> ApiException.badRequest("CART_EMPTY"));

        CustomerOrder order = new CustomerOrder(userRepository.getReferenceById(userId));
        cart.getItems().stream()
                .sorted(Comparator.comparing(item -> item.getProductVariant().getId()))
                .forEach(item -> order.addLine(requireActive(item), item.getQuantity()));
        orderRepository.saveAndFlush(order);

        Payment payment;
        if (decision == PaymentStatus.APPROVED) {
            order.getItems().forEach(line ->
                    stockService.registerSale(line.getProductVariant().getId(), line.getQuantity(), order.getId()));
            order.markPaid();
            cart.clear();
            payment = Payment.approved(order.getId(), OffsetDateTime.now(clock));
        } else {
            order.cancel();
            payment = Payment.rejected(order.getId());
        }
        paymentRepository.save(payment);
        return toResponse(order, order.getItems(), payment, photosOf(order.getItems()));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderDtos.OrderResponse> listOrders(UUID userId, int page, int size) {
        Page<CustomerOrder> orders = orderRepository.findByUserId(userId, PageRequest.of(page, size, NEWEST_FIRST));
        List<UUID> orderIds = orders.map(CustomerOrder::getId).getContent();
        Map<UUID, List<OrderItem>> itemsByOrder = itemsOf(orderIds);
        Map<UUID, Payment> paymentsByOrder = paymentsOf(orderIds);
        Map<UUID, ProductPhotos.Photo> photos = photosOf(
                itemsByOrder.values().stream().flatMap(List::stream).toList());
        return PageResponse.from(orders.map(order -> toResponse(
                order,
                itemsByOrder.getOrDefault(order.getId(), List.of()),
                paymentsByOrder.get(order.getId()),
                photos)));
    }

    @Transactional(readOnly = true)
    public OrderDtos.OrderResponse getOrder(UUID userId, UUID orderId) {
        CustomerOrder order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> ApiException.notFound("ORDER_NOT_FOUND"));
        List<UUID> orderIds = List.of(order.getId());
        List<OrderItem> items = itemsOf(orderIds).getOrDefault(order.getId(), List.of());
        return toResponse(order, items, paymentsOf(orderIds).get(order.getId()), photosOf(items));
    }

    private static ProductVariant requireActive(CartItem item) {
        ProductVariant variant = item.getProductVariant();
        if (!variant.getProduct().isActive()) {
            throw ApiException.conflict("PRODUCT_UNAVAILABLE", variant.getProduct().getName());
        }
        return variant;
    }

    private Map<UUID, List<OrderItem>> itemsOf(List<UUID> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        return orderItemRepository.findByOrderIdInOrderByProductNameSnapshotAsc(orderIds).stream()
                .collect(Collectors.groupingBy(item -> item.getOrder().getId()));
    }

    private Map<UUID, Payment> paymentsOf(List<UUID> orderIds) {
        if (orderIds.isEmpty()) {
            return Map.of();
        }
        return paymentRepository.findByOrderIdIn(orderIds).stream()
                .collect(Collectors.toMap(Payment::getOrderId, Function.identity()));
    }

    private Map<UUID, ProductPhotos.Photo> photosOf(List<OrderItem> items) {
        return productPhotos.firstPhotos(
                items.stream().map(item -> item.getProductVariant().getProduct().getId()).distinct().toList());
    }

    private static OrderDtos.OrderResponse toResponse(CustomerOrder order, List<OrderItem> items, Payment payment,
                                                      Map<UUID, ProductPhotos.Photo> photos) {
        List<OrderDtos.OrderLineResponse> lines = items.stream()
                .map(item -> toLine(item,
                        photos.getOrDefault(item.getProductVariant().getProduct().getId(), ProductPhotos.Photo.NONE)))
                .toList();
        int itemCount = items.stream().mapToInt(OrderItem::getQuantity).sum();
        OrderDtos.PaymentResponse paymentResponse = payment == null
                ? null
                : new OrderDtos.PaymentResponse(payment.getMethod(), payment.getStatus(), payment.getPaidAt());
        return new OrderDtos.OrderResponse(
                order.getId(),
                order.getStatus(),
                order.getCreatedAt(),
                lines,
                itemCount,
                CustomerOrder.totalOf(items),
                paymentResponse);
    }

    private static OrderDtos.OrderLineResponse toLine(OrderItem item, ProductPhotos.Photo photo) {
        ProductVariant variant = item.getProductVariant();
        return new OrderDtos.OrderLineResponse(
                variant.getId(),
                variant.getProduct().getId(),
                item.getProductNameSnapshot(),
                item.getVariantLabelSnapshot(),
                variant.getProduct().getCategory().getSlug(),
                variant.getColorName(),
                variant.getColorHex(),
                photo.url(),
                photo.color(),
                photo.colorHex(),
                item.getUnitPriceSnapshot(),
                item.getQuantity(),
                item.lineTotal());
    }
}
