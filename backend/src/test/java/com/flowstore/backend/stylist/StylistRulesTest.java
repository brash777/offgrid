package com.flowstore.backend.stylist;

import com.flowstore.backend.catalog.CatalogDtos.ProductSummaryResponse;
import com.flowstore.backend.catalog.EquipSlot;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class StylistRulesTest {

    @Test
    void readsBudgetsWrittenTheWayPeopleWriteThem() {
        assertThat(StylistRules.budget("máximo 800 mil")).contains(new BigDecimal("800000"));
        assertThat(StylistRules.budget("tengo 1.200.000 pesos")).contains(new BigDecimal("1200000"));
        assertThat(StylistRules.budget("unos 1,5 millones")).contains(new BigDecimal("1500000.0"));
        assertThat(StylistRules.budget("algo de 800k")).contains(new BigDecimal("800000"));
    }

    @Test
    void ignoresSmallNumbersWithoutUnit() {
        assertThat(StylistRules.budget("tenis talla 42")).isEmpty();
    }

    @Test
    void keepsThePartyOutfitWithinTheBudget() {
        List<ProductSummaryResponse> catalog = List.of(
                product("chaquetas", EquipSlot.TORSO, "900000"),
                product("chaquetas", EquipSlot.TORSO, "400000"),
                product("sneakers", EquipSlot.FEET, "700000"),
                product("sneakers", EquipSlot.FEET, "300000"),
                product("joyas", EquipSlot.ACCESSORY, "200000"));

        List<ProductSummaryResponse> outfit = StylistRules.pick("algo para una fiesta con 1 millón", catalog);

        BigDecimal total = outfit.stream().map(ProductSummaryResponse::basePrice).reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(total).isLessThanOrEqualTo(new BigDecimal("1000000"));
        assertThat(outfit).extracting(ProductSummaryResponse::categorySlug).contains("chaquetas");
    }

    @Test
    void alwaysPicksSomethingWhenThereIsStock() {
        List<ProductSummaryResponse> catalog = List.of(product("perfumes", EquipSlot.ACCESSORY, "500000"));

        assertThat(StylistRules.pick("sorpréndeme", catalog)).hasSize(1);
    }

    static ProductSummaryResponse product(String category, EquipSlot slot, String price) {
        return new ProductSummaryResponse(UUID.randomUUID(), category + " " + price, new BigDecimal(price), slot,
                category, category, null, null, 5, List.of());
    }
}
