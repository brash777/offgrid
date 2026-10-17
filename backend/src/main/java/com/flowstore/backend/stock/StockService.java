package com.flowstore.backend.stock;

import com.flowstore.backend.catalog.ProductVariant;
import com.flowstore.backend.catalog.ProductVariantRepository;
import com.flowstore.backend.shared.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StockService {

    private final StockMovementRepository stockMovementRepository;
    private final ProductVariantRepository variantRepository;

    public StockService(StockMovementRepository stockMovementRepository, ProductVariantRepository variantRepository) {
        this.stockMovementRepository = stockMovementRepository;
        this.variantRepository = variantRepository;
    }

    @Transactional(readOnly = true)
    public long availabilityOf(UUID variantId) {
        return stockMovementRepository.sumByVariantId(variantId);
    }

    @Transactional(readOnly = true)
    public Map<UUID, Long> availabilityByVariant(Collection<UUID> variantIds) {
        if (variantIds.isEmpty()) {
            return Map.of();
        }
        return toMap(stockMovementRepository.sumByVariantIds(variantIds));
    }

    @Transactional(readOnly = true)
    public Map<UUID, Long> availabilityByProduct(Collection<UUID> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return toMap(stockMovementRepository.sumByProductIds(productIds));
    }

    @Transactional
    public void restock(ProductVariant variant, int quantity) {
        requirePositive(quantity);
        stockMovementRepository.save(new StockMovement(variant, quantity, StockReason.RESTOCK, null));
    }

    @Transactional
    public void registerSale(UUID variantId, int quantity, UUID orderId) {
        requirePositive(quantity);
        ProductVariant variant = variantRepository.findByIdForUpdate(variantId)
                .orElseThrow(() -> ApiException.notFound("VARIANT_NOT_FOUND"));

        if (stockMovementRepository.sumByVariantId(variantId) < quantity) {
            throw ApiException.conflict("INSUFFICIENT_STOCK",
                    variant.getProduct().getName(), variant.getSize(), variant.getColorName());
        }
        stockMovementRepository.save(new StockMovement(variant, -quantity, StockReason.SALE, orderId));
    }

    private static void requirePositive(int quantity) {
        if (quantity <= 0) {
            throw ApiException.badRequest("INVALID_QUANTITY");
        }
    }

    private static Map<UUID, Long> toMap(List<StockMovementRepository.StockTotal> totals) {
        return totals.stream().collect(Collectors.toMap(
                StockMovementRepository.StockTotal::getId,
                StockMovementRepository.StockTotal::getQuantity));
    }
}
