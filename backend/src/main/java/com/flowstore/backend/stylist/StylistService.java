package com.flowstore.backend.stylist;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.flowstore.backend.catalog.CatalogDtos.ProductSummaryResponse;
import com.flowstore.backend.catalog.CategoryService;
import com.flowstore.backend.catalog.EquipSlot;
import com.flowstore.backend.catalog.ProductService;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.shared.MessageResolver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class StylistService {

    private static final Logger log = LoggerFactory.getLogger(StylistService.class);

    private static final int MAX_ROUNDS = 4;
    private static final int LAST_ROUND = MAX_ROUNDS - 1;
    private static final int MAX_ITEMS = 4;
    private static final int CATALOG_LIMIT = 200;
    private static final int MAX_PHOTO_BYTES = 1_000_000;
    private static final int MAX_MESSAGE_LENGTH = 400;
    private static final Set<String> TRY_ON_CATEGORIES = Set.of("buzos", "chaquetas");
    private static final String SEARCH_TOOL = "search_catalog";
    private static final String RECOMMEND_TOOL = "recommend_outfit";
    private static final String PHOTO_ONLY_PROMPT = "Build an outfit that suits the style in my photo.";
    private static final String BUDGET_NOTE =
            "%n(Budget: %s COP in total. Call search_catalog with max_price %s and keep the sum within it.)";
    private static final String SYSTEM_PROMPT = """
            You are the in-store stylist of OFFGRID, a streetwear shop in Colombia. Prices are in Colombian pesos (COP).
            First call search_catalog once without filters: the catalog is small and that shows every product.
            Search again with filters only if you really need it.
            Recommend only products returned by search_catalog, using their exact ids. Never invent products or prices.
            Pick 2 to 4 pieces that work together as one outfit, at most one per category.
            When the customer gives a budget, the sum of the prices must not exceed it.
            Include one hoodie or jacket (category buzos or chaquetas) whenever possible: the customer tries it on in a live mirror.
            If a photo is attached, look only at the clothes and colors the person is wearing and match them.
            Never comment on the body, face, age, skin or any personal trait.
            Finish by calling recommend_outfit. Its message must be in Spanish from Colombia, informal (tú),
            warm and short (at most two sentences), and must not mention prices.
            """;

    private final StylistProperties properties;
    private final ChatModelClient chatModel;
    private final ProductService productService;
    private final CategoryService categoryService;
    private final StylistRequestRepository requestRepository;
    private final MessageResolver messages;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public StylistService(StylistProperties properties,
                          ChatModelClient chatModel,
                          ProductService productService,
                          CategoryService categoryService,
                          StylistRequestRepository requestRepository,
                          MessageResolver messages,
                          ObjectMapper objectMapper,
                          Clock clock) {
        this.properties = properties;
        this.chatModel = chatModel;
        this.productService = productService;
        this.categoryService = categoryService;
        this.requestRepository = requestRepository;
        this.messages = messages;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public StylistDtos.StatusResponse status(UUID userId) {
        return new StylistDtos.StatusResponse(properties.ready(), properties.dailyLimit(), remaining(usedToday(userId)));
    }

    public StylistDtos.OutfitResponse recommend(UUID userId, StylistDtos.OutfitRequest request) {
        String prompt = request.prompt() == null ? "" : request.prompt().strip();
        String photo = photoDataUrl(request);
        if (prompt.isEmpty() && photo == null) {
            throw ApiException.badRequest("STYLIST_PROMPT_REQUIRED");
        }
        if (!properties.ready()) {
            return fallback(prompt, remaining(usedToday(userId)));
        }

        long used = usedToday(userId);
        if (used >= properties.dailyLimit()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "STYLIST_LIMIT_REACHED", properties.dailyLimit());
        }
        requestRepository.save(new StylistRequest(userId, photo != null));
        int remaining = remaining(used + 1);

        try {
            Outfit outfit = askModel(prompt.isEmpty() ? PHOTO_ONLY_PROMPT : prompt, photo);
            List<ProductSummaryResponse> items = withinBudget(availableItems(outfit.productIds()), prompt);
            if (!items.isEmpty()) {
                return new StylistDtos.OutfitResponse(trim(outfit.message()), items, StylistSource.AI, remaining);
            }
            log.warn("Stylist model answered without valid products");
        } catch (RuntimeException ex) {
            log.warn("Stylist model failed: {}", ex.getClass().getSimpleName());
        }
        return fallback(prompt, remaining);
    }

    private record Outfit(String message, List<UUID> productIds) {
    }

    private Outfit askModel(String prompt, String photo) {
        ArrayNode conversation = objectMapper.createArrayNode();
        conversation.addObject().put("role", "system").put("content", SYSTEM_PROMPT);
        String request = StylistRules.budget(prompt)
                .map(budget -> prompt + BUDGET_NOTE.formatted(budget.toBigInteger(), budget.toBigInteger()))
                .orElse(prompt);
        ObjectNode user = conversation.addObject().put("role", "user");
        if (photo == null) {
            user.put("content", request);
        } else {
            ArrayNode content = user.putArray("content");
            content.addObject().put("type", "text").put("text", request);
            content.addObject().put("type", "image_url").putObject("image_url").put("url", photo);
        }
        ArrayNode tools = tools();

        for (int round = 0; round < MAX_ROUNDS; round += 1) {
            JsonNode reply = chatModel.complete(conversation, tools, round == LAST_ROUND ? RECOMMEND_TOOL : null);
            JsonNode calls = reply.path("tool_calls");
            log.debug("Stylist round {} called {} tools", round + 1, calls.size());
            if (!calls.isArray() || calls.isEmpty()) {
                return new Outfit(reply.path("content").asText(""), List.of());
            }
            ObjectNode assistant = reply.deepCopy();
            assistant.put("role", "assistant");
            conversation.add(assistant);
            for (JsonNode call : calls) {
                String name = call.path("function").path("name").asText();
                log.debug("Stylist tool {}", name);
                JsonNode arguments = parse(call.path("function").path("arguments").asText("{}"));
                if (RECOMMEND_TOOL.equals(name)) {
                    return new Outfit(arguments.path("message").asText(""), ids(arguments.path("product_ids")));
                }
                String result = SEARCH_TOOL.equals(name) ? searchCatalog(arguments) : "{\"error\":\"unknown tool\"}";
                conversation.addObject()
                        .put("role", "tool")
                        .put("tool_call_id", call.path("id").asText())
                        .put("name", name)
                        .put("content", result);
            }
        }
        throw new IllegalStateException("The stylist did not finish in " + MAX_ROUNDS + " rounds");
    }

    private String searchCatalog(JsonNode arguments) {
        String category = arguments.path("category").asText(null);
        String query = arguments.path("query").asText(null);
        BigDecimal maxPrice = arguments.path("max_price").isNumber() ? arguments.path("max_price").decimalValue() : null;
        ArrayNode products = objectMapper.createArrayNode();
        productService.findInStock(category, query, CATALOG_LIMIT).stream()
                .filter(product -> maxPrice == null || product.basePrice().compareTo(maxPrice) <= 0)
                .forEach(product -> {
                    ObjectNode node = products.addObject()
                            .put("id", product.id().toString())
                            .put("name", product.name())
                            .put("category", product.categorySlug())
                            .put("price", product.basePrice())
                            .put("try_on", canTryOn(product));
                    ArrayNode colors = node.putArray("colors");
                    product.colors().forEach(color -> colors.add(color.name()));
                });
        return products.toString();
    }

    private ArrayNode tools() {
        ArrayNode tools = objectMapper.createArrayNode();
        ObjectNode search = tools.addObject().put("type", "function").putObject("function");
        search.put("name", SEARCH_TOOL)
                .put("description", "Lists the real products of the store that are in stock, with id, name, category, "
                        + "price in COP, colors and whether they can be tried on in the live mirror.");
        ObjectNode searchProperties = search.putObject("parameters").put("type", "object").putObject("properties");
        ArrayNode categories = searchProperties.putObject("category")
                .put("type", "string")
                .put("description", "Only this category. Leave it out to see every category.")
                .putArray("enum");
        categoryService.list().forEach(category -> categories.add(category.slug()));
        searchProperties.putObject("max_price").put("type", "number").put("description", "Maximum price in COP.");
        searchProperties.putObject("query").put("type", "string").put("description", "Words in the product name.");

        ObjectNode recommend = tools.addObject().put("type", "function").putObject("function");
        recommend.put("name", RECOMMEND_TOOL)
                .put("description", "Gives the final outfit to the customer.");
        ObjectNode parameters = recommend.putObject("parameters").put("type", "object");
        ObjectNode recommendProperties = parameters.putObject("properties");
        recommendProperties.putObject("product_ids")
                .put("type", "array")
                .put("description", "Ids returned by search_catalog, from 2 to 4.")
                .putObject("items").put("type", "string");
        recommendProperties.putObject("message")
                .put("type", "string")
                .put("description", "Short message for the customer in Spanish from Colombia, without prices.");
        parameters.putArray("required").add("product_ids").add("message");
        return tools;
    }

    private List<ProductSummaryResponse> availableItems(List<UUID> productIds) {
        List<UUID> unique = new ArrayList<>(new LinkedHashSet<>(productIds));
        return productService.summariesOf(unique).stream()
                .filter(product -> product.totalStock() > 0)
                .limit(MAX_ITEMS)
                .toList();
    }

    private static List<ProductSummaryResponse> withinBudget(List<ProductSummaryResponse> items, String prompt) {
        BigDecimal budget = StylistRules.budget(prompt).orElse(null);
        List<ProductSummaryResponse> kept = new ArrayList<>(items.stream()
                .filter(product -> budget == null || product.basePrice().compareTo(budget) <= 0)
                .toList());
        while (budget != null && kept.size() > 1 && total(kept).compareTo(budget) > 0) {
            kept.remove(kept.size() - 1);
        }
        return kept;
    }

    private static BigDecimal total(List<ProductSummaryResponse> items) {
        return items.stream().map(ProductSummaryResponse::basePrice).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private StylistDtos.OutfitResponse fallback(String prompt, int remaining) {
        List<ProductSummaryResponse> catalog = productService.findInStock(null, null, CATALOG_LIMIT);
        return new StylistDtos.OutfitResponse(
                messages.resolve("message.STYLIST_FALLBACK"),
                StylistRules.pick(prompt, catalog),
                StylistSource.RULES,
                remaining);
    }

    private String photoDataUrl(StylistDtos.OutfitRequest request) {
        if (request.photo() == null || request.photo().isBlank()) {
            return null;
        }
        if (!request.photoConsent()) {
            throw ApiException.badRequest("STYLIST_PHOTO_CONSENT_REQUIRED");
        }
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(request.photo().strip());
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("STYLIST_PHOTO_INVALID");
        }
        if (bytes.length > MAX_PHOTO_BYTES) {
            throw ApiException.payloadTooLarge("STYLIST_PHOTO_TOO_LARGE", MAX_PHOTO_BYTES / 1_000);
        }
        String mediaType = mediaTypeOf(bytes);
        if (mediaType == null) {
            throw ApiException.badRequest("STYLIST_PHOTO_INVALID");
        }
        return "data:" + mediaType + ";base64," + Base64.getEncoder().encodeToString(bytes);
    }

    private static String mediaTypeOf(byte[] bytes) {
        if (bytes.length > 3 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (bytes.length > 8 && (bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') {
            return "image/png";
        }
        return null;
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException ex) {
            return objectMapper.createObjectNode();
        }
    }

    private static List<UUID> ids(JsonNode values) {
        List<UUID> ids = new ArrayList<>();
        values.forEach(value -> {
            try {
                ids.add(UUID.fromString(value.asText()));
            } catch (IllegalArgumentException ex) {
                log.debug("Stylist returned an id that is not a UUID");
            }
        });
        return ids;
    }

    private static boolean canTryOn(ProductSummaryResponse product) {
        return product.slot() == EquipSlot.TORSO && TRY_ON_CATEGORIES.contains(product.categorySlug());
    }

    private static String trim(String message) {
        String clean = message == null ? "" : message.strip();
        return clean.length() <= MAX_MESSAGE_LENGTH ? clean : clean.substring(0, MAX_MESSAGE_LENGTH);
    }

    private long usedToday(UUID userId) {
        OffsetDateTime startOfDay = LocalDate.now(clock).atStartOfDay(clock.getZone()).toOffsetDateTime();
        return requestRepository.countByUserIdAndCreatedAtGreaterThanEqual(userId, startOfDay);
    }

    private int remaining(long used) {
        return (int) Math.max(0, properties.dailyLimit() - used);
    }
}
