package com.flowstore.backend.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class CatalogDtos {

    private CatalogDtos() {
    }

    @Schema(description = "Catalog category")
    public record CategoryResponse(UUID id, String slug, String name) {

        public static CategoryResponse from(Category category) {
            return new CategoryResponse(category.getId(), category.getSlug(), category.getName());
        }
    }

    @Schema(description = "Data to create or update a category")
    public record CategoryRequest(

            @NotBlank(message = "{validation.slug.required}")
            @Size(max = 60, message = "{validation.slug.size}")
            @Pattern(regexp = "^[a-z0-9]+(-[a-z0-9]+)*$", message = "{validation.slug.pattern}")
            String slug,

            @NotBlank(message = "{validation.name.required}")
            @Size(max = 80, message = "{validation.name.size}")
            String name
    ) {
    }

    @Schema(description = "Size and color of a product with its available stock")
    public record VariantResponse(
            UUID id,
            String size,
            String colorName,
            String colorHex,
            String sku,
            BigDecimal price,
            long availableStock
    ) {
    }

    @Schema(description = "Data to add a size and color to a product")
    public record CreateVariantRequest(

            @NotBlank(message = "{validation.variantSize.required}")
            @Size(max = 10, message = "{validation.variantSize.size}")
            String size,

            @NotBlank(message = "{validation.color.required}")
            @Size(max = 40, message = "{validation.color.size}")
            String colorName,

            @NotBlank(message = "{validation.colorHex.required}")
            @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "{validation.colorHex.pattern}")
            String colorHex,

            @NotBlank(message = "{validation.sku.required}")
            @Size(max = 40, message = "{validation.sku.size}")
            String sku,

            @DecimalMin(value = "0", message = "{validation.price.min}")
            @Digits(integer = 12, fraction = 2, message = "{validation.price.digits}")
            BigDecimal priceOverride,

            @NotNull(message = "{validation.initialStock.required}")
            @PositiveOrZero(message = "{validation.initialStock.min}")
            Integer initialStock
    ) {
    }

    @Schema(description = "Units to add to a variant's stock")
    public record RestockRequest(

            @NotNull(message = "{validation.quantity.required}")
            @Positive(message = "{validation.quantity.positive}")
            Integer quantity
    ) {
    }

    @Schema(description = "Color available for a product")
    public record ColorResponse(String name, String hex) {
    }

    @Schema(description = "Product as shown in a catalog list")
    public record ProductSummaryResponse(
            UUID id,
            String name,
            BigDecimal basePrice,
            EquipSlot slot,
            String categorySlug,
            String categoryName,
            String thumbnailUrl,
            long totalStock,
            List<ColorResponse> colors
    ) {
    }

    @Schema(description = "Product with its variants and images")
    public record ProductDetailResponse(
            UUID id,
            String name,
            String description,
            BigDecimal basePrice,
            EquipSlot slot,
            String categorySlug,
            String categoryName,
            boolean active,
            List<String> imageUrls,
            List<VariantResponse> variants
    ) {
    }

    @Schema(description = "Data to create a product")
    public record CreateProductRequest(

            @NotBlank(message = "{validation.category.required}")
            String categorySlug,

            @NotBlank(message = "{validation.name.required}")
            @Size(max = 140, message = "{validation.name.size}")
            String name,

            @Size(max = 4000, message = "{validation.description.size}")
            String description,

            @NotNull(message = "{validation.price.required}")
            @DecimalMin(value = "0", message = "{validation.price.min}")
            @Digits(integer = 12, fraction = 2, message = "{validation.price.digits}")
            BigDecimal basePrice,

            @NotNull(message = "{validation.slot.required}")
            EquipSlot slot
    ) {
    }

    @Schema(description = "Data to replace an existing product")
    public record UpdateProductRequest(

            @NotBlank(message = "{validation.category.required}")
            String categorySlug,

            @NotBlank(message = "{validation.name.required}")
            @Size(max = 140, message = "{validation.name.size}")
            String name,

            @Size(max = 4000, message = "{validation.description.size}")
            String description,

            @NotNull(message = "{validation.price.required}")
            @DecimalMin(value = "0", message = "{validation.price.min}")
            @Digits(integer = 12, fraction = 2, message = "{validation.price.digits}")
            BigDecimal basePrice,

            @NotNull(message = "{validation.slot.required}")
            EquipSlot slot,

            @NotNull(message = "{validation.active.required}")
            Boolean active
    ) {
    }

    @Schema(description = "Uploaded image")
    public record ImageResponse(String url) {
    }
}
