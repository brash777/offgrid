package com.flowstore.backend.stock;

import com.flowstore.backend.catalog.Category;
import com.flowstore.backend.catalog.EquipSlot;
import com.flowstore.backend.catalog.Product;
import com.flowstore.backend.catalog.ProductVariant;
import com.flowstore.backend.catalog.ProductVariantRepository;
import com.flowstore.backend.shared.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock
    private StockMovementRepository stockMovementRepository;

    @Mock
    private ProductVariantRepository variantRepository;

    private StockService stockService;
    private ProductVariant variant;
    private UUID variantId;

    @BeforeEach
    void setUp() {
        stockService = new StockService(stockMovementRepository, variantRepository);

        Category category = new Category("camisetas", "Camisetas");
        Product product = new Product(category, "Test shirt", "", new BigDecimal("50000.00"), EquipSlot.TORSO);
        variant = new ProductVariant(product, "M", "Negro", "#1a1a1a", "TEST-SKU-M", null);
        variantId = UUID.randomUUID();
        ReflectionTestUtils.setField(variant, "id", variantId);
    }

    @Test
    void availabilityIsTheSumOfMovements() {
        when(stockMovementRepository.sumByVariantId(variantId)).thenReturn(7L);

        assertThat(stockService.availabilityOf(variantId)).isEqualTo(7L);
    }

    @Test
    void restockStoresAPositiveMovement() {
        stockService.restock(variant, 10);

        StockMovement saved = capturedMovement();
        assertThat(saved.getQuantityDelta()).isEqualTo(10);
        assertThat(saved.getReason()).isEqualTo(StockReason.RESTOCK);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, -5})
    void restockRejectsNonPositiveQuantities(int quantity) {
        assertThatThrownBy(() -> stockService.restock(variant, quantity))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("INVALID_QUANTITY"));
        verifyNoInteractions(stockMovementRepository);
    }

    @Test
    void saleBeyondAvailableStockIsRejectedWithoutAMovement() {
        when(variantRepository.findByIdForUpdate(variantId)).thenReturn(Optional.of(variant));
        when(stockMovementRepository.sumByVariantId(variantId)).thenReturn(3L);

        assertThatThrownBy(() -> stockService.registerSale(variantId, 5, UUID.randomUUID()))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("INSUFFICIENT_STOCK"));
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void saleWithinAvailableStockLocksTheVariantAndStoresANegativeMovement() {
        UUID orderId = UUID.randomUUID();
        when(variantRepository.findByIdForUpdate(variantId)).thenReturn(Optional.of(variant));
        when(stockMovementRepository.sumByVariantId(variantId)).thenReturn(10L);

        stockService.registerSale(variantId, 4, orderId);

        StockMovement saved = capturedMovement();
        assertThat(saved.getQuantityDelta()).isEqualTo(-4);
        assertThat(saved.getReason()).isEqualTo(StockReason.SALE);
        assertThat(saved.getReferenceOrderId()).isEqualTo(orderId);
        verify(variantRepository).findByIdForUpdate(variantId);
    }

    private StockMovement capturedMovement() {
        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(captor.capture());
        return captor.getValue();
    }
}
