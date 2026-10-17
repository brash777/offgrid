package com.flowstore.backend.catalog;

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
@Table(name = "product_variants")
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 10)
    private String size;

    @Column(name = "color_name", nullable = false, length = 40)
    private String colorName;

    @Column(name = "color_hex", nullable = false, length = 7)
    private String colorHex;

    @Column(nullable = false, length = 40)
    private String sku;

    @Column(name = "price_override", precision = 14, scale = 2)
    private BigDecimal priceOverride;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected ProductVariant() {
    }

    public ProductVariant(Product product, String size, String colorName, String colorHex, String sku,
                          BigDecimal priceOverride) {
        this.product = product;
        this.size = size;
        this.colorName = colorName;
        this.colorHex = colorHex;
        this.sku = sku;
        this.priceOverride = priceOverride;
    }

    public BigDecimal effectivePrice() {
        return priceOverride != null ? priceOverride : product.getBasePrice();
    }

    public UUID getId() {
        return id;
    }

    public Product getProduct() {
        return product;
    }

    public String getSize() {
        return size;
    }

    public String getColorName() {
        return colorName;
    }

    public String getColorHex() {
        return colorHex;
    }

    public String getSku() {
        return sku;
    }
}
