package com.flowstore.backend.stylist;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowstore.backend.catalog.CatalogDtos.ProductSummaryResponse;
import com.flowstore.backend.catalog.CategoryService;
import com.flowstore.backend.catalog.EquipSlot;
import com.flowstore.backend.catalog.ProductService;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.shared.MessageResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StylistServiceTest {

    private static final int DAILY_LIMIT = 3;

    @Mock
    private ChatModelClient chatModel;

    @Mock
    private ProductService productService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private StylistRequestRepository requestRepository;

    @Mock
    private MessageResolver messages;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-21T15:00:00Z"), ZoneId.of("America/Bogota"));
    private final UUID userId = UUID.randomUUID();
    private ProductSummaryResponse hoodie;

    @BeforeEach
    void setUp() {
        hoodie = StylistRulesTest.product("buzos", EquipSlot.TORSO, "749900");
        lenient().when(categoryService.list()).thenReturn(List.of());
        lenient().when(productService.findInStock(isNull(), isNull(), anyInt())).thenReturn(List.of(hoodie));
        lenient().when(messages.resolve("message.STYLIST_FALLBACK")).thenReturn("look por reglas");
    }

    private StylistService service(boolean enabled) {
        StylistProperties properties = new StylistProperties(
                enabled, "test-key", "http://localhost", "test-model", Duration.ofSeconds(5), DAILY_LIMIT);
        return new StylistService(properties, chatModel, productService, categoryService, requestRepository,
                messages, objectMapper, clock);
    }

    private JsonNode json(String value) throws Exception {
        return objectMapper.readTree(value);
    }

    @Test
    void onlyRealProductsComeBackWithDatabasePrices() throws Exception {
        UUID invented = UUID.randomUUID();
        when(chatModel.complete(any(), any(), any()))
                .thenReturn(json("""
                        {"role":"assistant","tool_calls":[{"id":"1","type":"function",
                         "function":{"name":"search_catalog","arguments":"{}"}}]}"""))
                .thenReturn(json("""
                        {"role":"assistant","tool_calls":[{"id":"2","type":"function",
                         "function":{"name":"recommend_outfit",
                         "arguments":"{\\"product_ids\\":[\\"%s\\",\\"%s\\"],\\"message\\":\\"Te queda brutal\\"}"}}]}"""
                        .formatted(hoodie.id(), invented)));
        when(productService.summariesOf(List.of(hoodie.id(), invented))).thenReturn(List.of(hoodie));

        StylistDtos.OutfitResponse response = service(true).recommend(userId,
                new StylistDtos.OutfitRequest("algo para la noche", null, false));

        assertThat(response.source()).isEqualTo(StylistSource.AI);
        assertThat(response.items()).containsExactly(hoodie);
        assertThat(response.message()).isEqualTo("Te queda brutal");
        assertThat(response.remainingToday()).isEqualTo(DAILY_LIMIT - 1);
        verify(requestRepository).save(any(StylistRequest.class));
    }

    @Test
    void aSuggestionAboveTheBudgetIsNotTrusted() throws Exception {
        when(chatModel.complete(any(), any(), any())).thenReturn(json("""
                {"role":"assistant","tool_calls":[{"id":"1","type":"function",
                 "function":{"name":"recommend_outfit",
                 "arguments":"{\\"product_ids\\":[\\"%s\\"],\\"message\\":\\"Te queda brutal\\"}"}}]}"""
                .formatted(hoodie.id())));
        when(productService.summariesOf(List.of(hoodie.id()))).thenReturn(List.of(hoodie));

        StylistDtos.OutfitResponse response = service(true).recommend(userId,
                new StylistDtos.OutfitRequest("algo con máximo 500 mil", null, false));

        assertThat(response.source()).isEqualTo(StylistSource.RULES);
    }

    @Test
    void theDailyLimitAnswers429WithoutCallingTheAi() {
        when(requestRepository.countByUserIdAndCreatedAtGreaterThanEqual(eq(userId), any())).thenReturn((long) DAILY_LIMIT);

        assertThatThrownBy(() -> service(true).recommend(userId, new StylistDtos.OutfitRequest("hola", null, false)))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
                    assertThat(ex.getCode()).isEqualTo("STYLIST_LIMIT_REACHED");
                });
        verify(chatModel, never()).complete(any(), any(), any());
    }

    @Test
    void aPhotoNeedsConsent() {
        String jpeg = Base64.getEncoder().encodeToString(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x10});

        assertThatThrownBy(() -> service(true).recommend(userId, new StylistDtos.OutfitRequest(null, jpeg, false)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("STYLIST_PHOTO_CONSENT_REQUIRED"));
    }

    @Test
    void somethingThatIsNotAnImageIsRejected() {
        String text = Base64.getEncoder().encodeToString("no soy una foto".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> service(true).recommend(userId, new StylistDtos.OutfitRequest(null, text, true)))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("STYLIST_PHOTO_INVALID"));
    }

    @Test
    void whenTheAiFailsTheRulesStillAnswer() {
        when(chatModel.complete(any(), any(), any())).thenThrow(new RestClientException("timeout"));

        StylistDtos.OutfitResponse response = service(true).recommend(userId,
                new StylistDtos.OutfitRequest("algo para el frío", null, false));

        assertThat(response.source()).isEqualTo(StylistSource.RULES);
        assertThat(response.items()).containsExactly(hoodie);
        assertThat(response.message()).isEqualTo("look por reglas");
    }

    @Test
    void whenTheAiIsOffNothingIsSentNorCounted() {
        StylistDtos.OutfitResponse response = service(false).recommend(userId,
                new StylistDtos.OutfitRequest("algo para el frío", null, false));

        assertThat(response.source()).isEqualTo(StylistSource.RULES);
        verify(chatModel, never()).complete(any(), any(), any());
        verify(requestRepository, never()).save(any());
        verify(productService, never()).summariesOf(anyList());
    }
}
