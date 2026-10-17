package com.flowstore.backend.cart;

import com.flowstore.backend.catalog.Product;
import com.flowstore.backend.catalog.ProductVariant;
import com.flowstore.backend.catalog.ProductVariantRepository;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.stock.StockService;
import com.flowstore.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CartService {

    public static final int MAX_UNITS_PER_LINE = 10;

    private final CartRepository cartRepository;
    private final ProductVariantRepository variantRepository;
    private final UserRepository userRepository;
    private final StockService stockService;

    public CartService(CartRepository cartRepository,
                       ProductVariantRepository variantRepository,
                       UserRepository userRepository,
                       StockService stockService) {
        this.cartRepository = cartRepository;
        this.variantRepository = variantRepository;
        this.userRepository = userRepository;
        this.stockService = stockService;
    }

    @Transactional(readOnly = true)
    public CartDtos.CartResponse getCart(UUID userId) {
        return cartRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseGet(CartService::emptyCart);
    }

    @Transactional
    public CartDtos.CartResponse addItem(UUID userId, CartDtos.AddItemRequest request) {
        ProductVariant variant = variantRepository.findById(request.variantId())
                .orElseThrow(() -> ApiException.notFound("VARIANT_NOT_FOUND"));
        requireActive(variant);
        Cart cart = cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(new Cart(userRepository.getReferenceById(userId))));
        int current = cart.itemFor(variant.getId()).map(CartItem::getQuantity).orElse(0);
        int quantity = current + request.quantity();
        requireAvailable(variant, quantity);
        cart.put(variant, quantity);
        return toResponse(cart);
    }

    @Transactional
    public CartDtos.CartResponse updateItem(UUID userId, UUID variantId, CartDtos.UpdateItemRequest request) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("CART_ITEM_NOT_FOUND"));
        CartItem item = cart.itemFor(variantId)
                .orElseThrow(() -> ApiException.notFound("CART_ITEM_NOT_FOUND"));
        requireAvailable(item.getProductVariant(), request.quantity());
        cart.put(item.getProductVariant(), request.quantity());
        return toResponse(cart);
    }

    @Transactional
    public CartDtos.CartResponse removeItem(UUID userId, UUID variantId) {
        return cartRepository.findByUserId(userId)
                .map(cart -> {
                    cart.remove(variantId);
                    return toResponse(cart);
                })
                .orElseGet(CartService::emptyCart);
    }

    private void requireAvailable(ProductVariant variant, int quantity) {
        if (quantity > MAX_UNITS_PER_LINE) {
            throw ApiException.badRequest("CART_LINE_LIMIT", MAX_UNITS_PER_LINE);
        }
        if (stockService.availabilityOf(variant.getId()) < quantity) {
            throw ApiException.conflict("INSUFFICIENT_STOCK",
                    variant.getProduct().getName(), variant.getSize(), variant.getColorName());
        }
    }

    private static void requireActive(ProductVariant variant) {
        if (!variant.getProduct().isActive()) {
            throw ApiException.conflict("PRODUCT_UNAVAILABLE", variant.getProduct().getName());
        }
    }

    private CartDtos.CartResponse toResponse(Cart cart) {
        List<CartItem> items = cart.getItems();
        Map<UUID, Long> stock = stockService.availabilityByVariant(
                items.stream().map(item -> item.getProductVariant().getId()).toList());
        List<CartDtos.CartItemResponse> lines = items.stream()
                .map(item -> toLine(item, stock.getOrDefault(item.getProductVariant().getId(), 0L)))
                .toList();
        BigDecimal subtotal = lines.stream()
                .map(CartDtos.CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int itemCount = lines.stream().mapToInt(CartDtos.CartItemResponse::quantity).sum();
        return new CartDtos.CartResponse(lines, itemCount, subtotal, MAX_UNITS_PER_LINE);
    }

    private static CartDtos.CartItemResponse toLine(CartItem item, long available) {
        ProductVariant variant = item.getProductVariant();
        Product product = variant.getProduct();
        BigDecimal unitPrice = variant.effectivePrice();
        return new CartDtos.CartItemResponse(
                variant.getId(),
                product.getId(),
                product.getName(),
                product.getCategory().getSlug(),
                variant.getSize(),
                variant.getColorName(),
                variant.getColorHex(),
                unitPrice,
                item.getQuantity(),
                available,
                unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
    }

    private static CartDtos.CartResponse emptyCart() {
        return new CartDtos.CartResponse(List.of(), 0, BigDecimal.ZERO, MAX_UNITS_PER_LINE);
    }
}
