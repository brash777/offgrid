package com.flowstore.backend.support;

import com.flowstore.backend.config.FlowProperties;

import java.time.Duration;
import java.util.List;

public final class TestProperties {

    public static final String JWT_SECRET = "test-signing-secret-with-at-least-32-bytes";

    private TestProperties() {
    }

    public static FlowProperties defaults() {
        return withJwt(JWT_SECRET, Duration.ofMinutes(15));
    }

    public static FlowProperties withJwt(String secret, Duration accessTokenTtl) {
        return new FlowProperties(
                new FlowProperties.Jwt(secret, "flowstore", accessTokenTtl, Duration.ofDays(30)),
                new FlowProperties.Cors(List.of("http://localhost:5173")),
                new FlowProperties.PasswordReset(Duration.ofMinutes(30)),
                new FlowProperties.Storage("./uploads"));
    }
}
