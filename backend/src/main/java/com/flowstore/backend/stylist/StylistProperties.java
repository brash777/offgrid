package com.flowstore.backend.stylist;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

@ConfigurationProperties(prefix = "flow.ai")
public record StylistProperties(
        @DefaultValue("false") boolean enabled,
        String apiKey,
        @DefaultValue("https://generativelanguage.googleapis.com/v1beta/openai") String baseUrl,
        @DefaultValue("gemini-3.5-flash-lite") String model,
        @DefaultValue("PT20S") Duration timeout,
        @DefaultValue("25") int dailyLimit
) {

    public boolean ready() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
