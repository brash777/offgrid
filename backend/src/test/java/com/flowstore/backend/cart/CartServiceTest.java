package com.flowstore.backend.cart;

import com.flowstore.backend.catalog.Category;
import com.flowstore.backend.catalog.EquipSlot;
import com.flowstore.backend.catalog.Product;
import com.flowstore.backend.catalog.ProductPhotos;
import com.flowstore.backend.catalog.ProductVariant;
import com.flowstore.backend.catalog.ProductVariantRepository;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.stock.StockService;
import com.flowstore.backend.user.User;
import com.flowstore.backend.user.UserRepository;
import com.flowstore.backend.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private ProductVariantRepository variantRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private StockService stockService;

    @Mock
    private ProductPhotos productPhotos;

    private CartService cartService;
    private UUID userId;
    private Cart cart;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        cartService = new CartService(cartRepository, variantRepository, userRepository, stockService, productPhotos);
        userId = UUID.randomUUID();
        User user = new User("ana@flowstore.app", "hash", "Ana Prueba", UserRole.CUSTOMER);
        cart = new Cart(user);

        Product product = new Product(new Category("camisetas", "Camisetas"), "Camiseta Street", "",
                new BigDecimal("55000.00"), EquipSlot.TORSO);
        variant = new ProductVariant(product, "M", "Negro", "#1a1a1a", "CAM-STR-M", null);
        ReflectionTestUtils.setField(variant, "id", UUID.randomUUID());

        when(variantRepository.findById(variant.getId())).thenReturn(Optional.of(variant));
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
    }

    @Test
    void addingUnitsAccumulatesThemAndTheSubtotalComesFromTheLines() {
        when(stockService.availabilityOf(variant.getId())).thenReturn(15L);
        when(stockService.availabilityByVariant(anyCollection())).thenReturn(Map.of(variant.getId(), 15L));

        cartService.addItem(userId, new CartDtos.AddItemRequest(variant.getId(), 1));
        CartDtos.CartResponse response = cartService.addItem(userId, new CartDtos.AddItemRequest(variant.getId(), 2));

        assertThat(response.items()).singleElement().satisfies(line -> {
            assertThat(line.quantity()).isEqualTo(3);
            assertThat(line.lineTotal()).isEqualByComparingTo("165000.00");
            assertThat(line.available()).isEqualTo(15L);
        });
        assertThat(response.itemCount()).isEqualTo(3);
        assertThat(response.subtotal()).isEqualByComparingTo("165000.00");
    }

    @Test
    void addingMoreUnitsThanTheStockIsRejected() {
        when(stockService.availabilityOf(variant.getId())).thenReturn(2L);

        assertThatThrownBy(() -> cartService.addItem(userId, new CartDtos.AddItemRequest(variant.getId(), 3)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo("INSUFFICIENT_STOCK"));
        assertThat(cart.isEmpty()).isTrue();
    }

    @Test
    void aLineCannotGoOverTheUnitLimit() {
        cart.put(variant, CartService.MAX_UNITS_PER_LINE);

        assertThatThrownBy(() -> cartService.addItem(userId, new CartDtos.AddItemRequest(variant.getId(), 1)))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CART_LINE_LIMIT"));
    }
}
