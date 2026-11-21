package com.flowstore.backend.stylist;

import com.flowstore.backend.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stylist")
@Tag(name = "Stylist")
public class StylistController {

    private final StylistService stylistService;

    public StylistController(StylistService stylistService) {
        this.stylistService = stylistService;
    }

    @GetMapping("/status")
    @Operation(summary = "Whether the AI stylist is on and how many requests the user has left today")
    public StylistDtos.StatusResponse status(@AuthenticationPrincipal AuthenticatedUser user) {
        return stylistService.status(user.id());
    }

    @PostMapping("/outfits")
    @Operation(summary = "Build an outfit with real catalog products",
            description = "The AI searches the catalog with a tool and only products that exist, are active and have stock "
                    + "come back, with prices from the database. The optional photo needs photoConsent, is only sent to "
                    + "the AI provider for this answer and is never stored. If the AI is off or fails, the outfit is "
                    + "built with simple rules and source is RULES.")
    public StylistDtos.OutfitResponse outfit(@AuthenticationPrincipal AuthenticatedUser user,
                                             @Valid @RequestBody StylistDtos.OutfitRequest request) {
        return stylistService.recommend(user.id(), request);
    }
}
