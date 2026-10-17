package com.flowstore.backend.catalog;

import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

final class ProductSpecifications {

    private ProductSpecifications() {
    }

    static Specification<Product> active() {
        return (root, query, builder) -> builder.isTrue(root.get("active"));
    }

    static Specification<Product> inCategory(String categorySlug) {
        return (root, query, builder) -> builder.equal(root.get("category").get("slug"), categorySlug);
    }

    static Specification<Product> inSlot(EquipSlot slot) {
        return (root, query, builder) -> builder.equal(root.get("slot"), slot);
    }

    static Specification<Product> nameContains(String text) {
        String pattern = "%" + escapeLike(text.toLowerCase(Locale.ROOT)) + "%";
        return (root, query, builder) -> builder.like(builder.lower(root.get("name")), pattern, '\\');
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
