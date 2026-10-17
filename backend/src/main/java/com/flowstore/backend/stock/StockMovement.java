package com.flowstore.backend.stock;

import com.flowstore.backend.catalog.ProductVariant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_variant_id", nullable = false)
    private ProductVariant productVariant;

    @Column(name = "quantity_delta", nullable = false)
    private int quantityDelta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StockReason reason;

    @Column(name = "reference_order_id")
    private UUID referenceOrderId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected StockMovement() {
    }

    public StockMovement(ProductVariant productVariant, int quantityDelta, StockReason reason, UUID referenceOrderId) {
        this.productVariant = productVariant;
        this.quantityDelta = quantityDelta;
        this.reason = reason;
        this.referenceOrderId = referenceOrderId;
    }

    public int getQuantityDelta() {
        return quantityDelta;
    }

    public StockReason getReason() {
        return reason;
    }

    public UUID getReferenceOrderId() {
        return referenceOrderId;
    }
}
