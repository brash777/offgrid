package com.flowstore.backend.stock;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {

    @Query("""
            SELECT COALESCE(SUM(m.quantityDelta), 0) FROM StockMovement m
            WHERE m.productVariant.id = :variantId
            """)
    long sumByVariantId(@Param("variantId") UUID variantId);

    @Query("""
            SELECT m.productVariant.id AS id, SUM(m.quantityDelta) AS quantity
            FROM StockMovement m
            WHERE m.productVariant.id IN :variantIds
            GROUP BY m.productVariant.id
            """)
    List<StockTotal> sumByVariantIds(@Param("variantIds") Collection<UUID> variantIds);

    @Query("""
            SELECT m.productVariant.product.id AS id, SUM(m.quantityDelta) AS quantity
            FROM StockMovement m
            WHERE m.productVariant.product.id IN :productIds
            GROUP BY m.productVariant.product.id
            """)
    List<StockTotal> sumByProductIds(@Param("productIds") Collection<UUID> productIds);

    interface StockTotal {

        UUID getId();

        Long getQuantity();
    }
}
