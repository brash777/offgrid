package com.flowstore.backend.catalog;

import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;
import java.util.Locale;
import java.util.UUID;

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

    static Specification<Product> idIn(Collection<UUID> ids) {
        return (root, query, builder) -> root.get("id").in(ids);
    }

    static Specification<Product> nameContains(String text) {
        String pattern = "%" + escapeLike(text.toLowerCase(Locale.ROOT)) + "%";
        return (root, query, builder) -> builder.like(builder.lower(root.get("name")), pattern, '\\');
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
