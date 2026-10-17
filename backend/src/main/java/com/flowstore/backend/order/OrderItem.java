package com.flowstore.backend.order;

import com.flowstore.backend.catalog.ProductVariant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private CustomerOrder order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_variant_id", nullable = false, updatable = false)
    private ProductVariant productVariant;

    @Column(name = "product_name_snapshot", nullable = false, length = 140, updatable = false)
    private String productNameSnapshot;

    @Column(name = "variant_label_snapshot", nullable = false, length = 60, updatable = false)
    private String variantLabelSnapshot;

    @Column(name = "unit_price_snapshot", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal unitPriceSnapshot;

    @Column(nullable = false, updatable = false)
    private short quantity;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected OrderItem() {
    }

    OrderItem(CustomerOrder order, ProductVariant variant, int quantity) {
        this.order = order;
        this.productVariant = variant;
        this.productNameSnapshot = variant.getProduct().getName();
        this.variantLabelSnapshot = variant.getSize() + " · " + variant.getColorName();
        this.unitPriceSnapshot = variant.effectivePrice();
        this.quantity = (short) quantity;
    }

    public BigDecimal lineTotal() {
        return unitPriceSnapshot.multiply(BigDecimal.valueOf(quantity));
    }

    public CustomerOrder getOrder() {
        return order;
    }

    public ProductVariant getProductVariant() {
        return productVariant;
    }

    public String getProductNameSnapshot() {
        return productNameSnapshot;
    }

    public String getVariantLabelSnapshot() {
        return variantLabelSnapshot;
    }

    public BigDecimal getUnitPriceSnapshot() {
        return unitPriceSnapshot;
    }

    public int getQuantity() {
        return quantity;
    }
}
