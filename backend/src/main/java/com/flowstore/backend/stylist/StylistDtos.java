package com.flowstore.backend.stylist;

import com.flowstore.backend.catalog.CatalogDtos;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class StylistDtos {

    private StylistDtos() {
    }

    @Schema(description = "What the customer wants and, optionally, a photo to read their style")
    public record OutfitRequest(

            @Size(max = 300, message = "{validation.stylistPrompt.size}")
            String prompt,

            @Schema(description = "JPEG or PNG in base64, only used for this answer and never stored")
            @Size(max = 1_400_000, message = "{validation.photo.size}")
            String photo,

            @Schema(description = "The customer accepted that the photo is sent to the AI provider")
            boolean photoConsent
    ) {
    }

    @Schema(description = "Outfit made only of real catalog products, with prices from the database")
    public record OutfitResponse(
            String message,
            List<CatalogDtos.ProductSummaryResponse> items,
            StylistSource source,
            int remainingToday
    ) {
    }

    @Schema(description = "Whether the AI is on and how many requests the user has left today")
    public record StatusResponse(boolean aiEnabled, int dailyLimit, int remainingToday) {
    }
}
