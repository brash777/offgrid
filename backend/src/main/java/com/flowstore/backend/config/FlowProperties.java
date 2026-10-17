package com.flowstore.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

@ConfigurationProperties(prefix = "flow")
public record FlowProperties(
        @DefaultValue Jwt jwt,
        @DefaultValue Cors cors,
        @DefaultValue PasswordReset passwordReset,
        @DefaultValue Storage storage
) {

    public record Jwt(
            String secret,
            @DefaultValue("flowstore") String issuer,
            @DefaultValue("PT15M") Duration accessTokenTtl,
            @DefaultValue("P30D") Duration refreshTokenTtl
    ) {
    }

    public record Cors(@DefaultValue("http://localhost:5173") List<String> allowedOrigins) {
    }

    public record PasswordReset(@DefaultValue("PT30M") Duration tokenTtl) {
    }

    public record Storage(@DefaultValue("./uploads") String basePath) {

        public Path root() {
            return Path.of(basePath).toAbsolutePath().normalize();
        }
    }
}
