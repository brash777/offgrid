package com.flowstore.backend.auth;

import com.flowstore.backend.support.TestProperties;
import com.flowstore.backend.user.UserRole;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private final JwtService jwtService = startedService(Duration.ofMinutes(15));

    @Test
    void issuedTokenIsVerifiedWithTheSameClaims() {
        UUID userId = UUID.randomUUID();

        String token = jwtService.issueAccessToken(userId, "ana@flowstore.app", "Ana", UserRole.CUSTOMER).value();
        AuthenticatedUser user = jwtService.verify(token);

        assertThat(user.id()).isEqualTo(userId);
        assertThat(user.email()).isEqualTo("ana@flowstore.app");
        assertThat(user.role()).isEqualTo(UserRole.CUSTOMER);
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwtService.issueAccessToken(UUID.randomUUID(), "a@flowstore.app", "A", UserRole.ADMIN).value();
        String tampered = token.substring(0, token.length() - 4) + "abcd";

        assertThatThrownBy(() -> jwtService.verify(tampered))
                .isInstanceOf(JwtService.TokenInvalidException.class);
    }

    @Test
    void expiredTokenIsReportedAsExpired() {
        JwtService expiringService = startedService(Duration.ofSeconds(-10));
        String token = expiringService.issueAccessToken(UUID.randomUUID(), "a@flowstore.app", "A", UserRole.CUSTOMER)
                .value();

        assertThatThrownBy(() -> expiringService.verify(token))
                .isInstanceOf(JwtService.TokenExpiredException.class);
    }

    @Test
    void tokenWithoutRoleIsRejected() {
        String token = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer("flowstore")
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(Keys.hmacShaKeyFor(TestProperties.JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> jwtService.verify(token))
                .isInstanceOf(JwtService.TokenInvalidException.class);
    }

    @Test
    void startupFailsWithoutSecret() {
        JwtService service = new JwtService(TestProperties.withJwt(null, Duration.ofMinutes(15)));

        assertThatThrownBy(service::initSigningKey)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void startupFailsWithShortSecret() {
        JwtService service = new JwtService(TestProperties.withJwt("too-short", Duration.ofMinutes(15)));

        assertThatThrownBy(service::initSigningKey)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }

    private static JwtService startedService(Duration accessTokenTtl) {
        JwtService service = new JwtService(TestProperties.withJwt(TestProperties.JWT_SECRET, accessTokenTtl));
        service.initSigningKey();
        return service;
    }
}
