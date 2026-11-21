package com.flowstore.backend.stylist;

import com.flowstore.backend.catalog.CatalogDtos.ProductSummaryResponse;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class StylistRules {

    private static final int MAX_ITEMS = 3;
    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1_000);
    private static final BigDecimal MILLION = BigDecimal.valueOf(1_000_000);
    private static final BigDecimal SMALL_AMOUNT = BigDecimal.valueOf(10_000);
    private static final BigDecimal SHARE_SLACK = new BigDecimal("1.6");
    private static final Pattern AMOUNT = Pattern.compile(
            "(\\d{1,3}(?:[.,]\\d{3})+|\\d+(?:[.,]\\d+)?)\\s*(millones|millón|millon|mil|k|m)?(?![\\p{L}])");
    private static final Pattern GROUPED = Pattern.compile("\\d{1,3}(?:[.,]\\d{3})+");
    private static final Comparator<ProductSummaryResponse> BY_PRICE = Comparator.comparing(ProductSummaryResponse::basePrice);

    private record Occasion(Pattern words, List<String> categories) {
    }

    private static final List<Occasion> OCCASIONS = List.of(
            new Occasion(Pattern.compile("fiesta|rumba|noche|disco|parche|concierto|evento"),
                    List.of("chaquetas", "sneakers", "joyas", "perfumes")),
            new Occasion(Pattern.compile("fr[ií]o|lluvia|invierno|bogot[aá]|abrigo"),
                    List.of("chaquetas", "buzos", "gorras", "sneakers")),
            new Occasion(Pattern.compile("gym|deporte|correr|entrenar|f[uú]tbol"),
                    List.of("buzos", "sneakers", "gorras")),
            new Occasion(Pattern.compile("cita|elegante|formal|cena"),
                    List.of("buzos", "sneakers", "perfumes", "gafas")));
    private static final List<String> DEFAULT_CATEGORIES = List.of("buzos", "sneakers", "gorras");

    private StylistRules() {
    }

    static Optional<BigDecimal> budget(String prompt) {
        Matcher matcher = AMOUNT.matcher(prompt.toLowerCase(Locale.ROOT));
        BigDecimal best = null;
        while (matcher.find()) {
            BigDecimal amount = amountOf(matcher.group(1), matcher.group(2));
            if (amount != null && (best == null || amount.compareTo(best) > 0)) {
                best = amount;
            }
        }
        return Optional.ofNullable(best).filter(amount -> amount.signum() > 0);
    }

    static List<ProductSummaryResponse> pick(String prompt, List<ProductSummaryResponse> catalog) {
        String text = prompt.toLowerCase(Locale.ROOT);
        List<String> categories = OCCASIONS.stream()
                .filter(occasion -> occasion.words().matcher(text).find())
                .findFirst()
                .map(Occasion::categories)
                .orElse(DEFAULT_CATEGORIES);
        BigDecimal remaining = budget(text).orElse(null);

        List<ProductSummaryResponse> picked = new ArrayList<>();
        for (int index = 0; index < categories.size() && picked.size() < MAX_ITEMS; index += 1) {
            String category = categories.get(index);
            int slots = Math.min(categories.size() - index, MAX_ITEMS - picked.size());
            BigDecimal cap = remaining == null ? null
                    : remaining.multiply(SHARE_SLACK).divide(BigDecimal.valueOf(slots), 2, RoundingMode.DOWN).min(remaining);
            List<ProductSummaryResponse> options = catalog.stream()
                    .filter(product -> product.categorySlug().equals(category))
                    .toList();
            BigDecimal left = remaining;
            Optional<ProductSummaryResponse> choice = cap == null
                    ? options.stream().max(BY_PRICE)
                    : options.stream()
                            .filter(product -> product.basePrice().compareTo(cap) <= 0)
                            .max(BY_PRICE)
                            .or(() -> options.stream()
                                    .filter(product -> product.basePrice().compareTo(left) <= 0)
                                    .min(BY_PRICE));
            if (choice.isPresent()) {
                picked.add(choice.get());
                remaining = remaining == null ? null : remaining.subtract(choice.get().basePrice());
            }
        }
        if (picked.isEmpty()) {
            catalog.stream().min(BY_PRICE).ifPresent(picked::add);
        }
        return picked;
    }

    private static BigDecimal amountOf(String number, String unit) {
        BigDecimal value = GROUPED.matcher(number).matches()
                ? new BigDecimal(number.replaceAll("[.,]", ""))
                : new BigDecimal(number.replace(',', '.'));
        if (unit == null) {
            return value.compareTo(SMALL_AMOUNT) < 0 ? null : value;
        }
        return switch (unit) {
            case "mil", "k" -> value.multiply(THOUSAND);
            default -> value.multiply(MILLION);
        };
    }
}
