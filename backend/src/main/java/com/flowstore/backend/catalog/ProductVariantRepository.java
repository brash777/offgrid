package com.flowstore.backend.catalog;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {

    List<ProductVariant> findByProductIdOrderByColorNameAscSizeAsc(UUID productId);

    Optional<ProductVariant> findByIdAndProductId(UUID id, UUID productId);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsByProductIdAndSizeAndColorName(UUID productId, String size, String colorName);

    @Query("""
            SELECT DISTINCT new com.flowstore.backend.catalog.ProductColorView(v.product.id, v.colorName, v.colorHex)
            FROM ProductVariant v
            WHERE v.product.id IN :productIds
            ORDER BY v.colorName
            """)
    List<ProductColorView> findColorsByProductIds(@Param("productIds") Collection<UUID> productIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM ProductVariant v WHERE v.id = :id")
    Optional<ProductVariant> findByIdForUpdate(@Param("id") UUID id);
}
