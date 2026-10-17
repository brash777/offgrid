package com.flowstore.backend.auth;

import com.flowstore.backend.config.FlowProperties;
import com.flowstore.backend.user.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_NAME = "name";
    private static final String CLAIM_ROLE = "role";
    private static final int MIN_SECRET_BYTES = 32;

    private final FlowProperties.Jwt settings;
    private SecretKey signingKey;

    public JwtService(FlowProperties properties) {
        this.settings = properties.jwt();
    }

    @PostConstruct
    void initSigningKey() {
        String secret = settings.secret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not set. Generate one with: openssl rand -base64 48");
        }
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least " + MIN_SECRET_BYTES + " bytes long, got " + secretBytes.length);
        }
        signingKey = Keys.hmacShaKeyFor(secretBytes);
    }

    public IssuedToken issueAccessToken(UUID userId, String email, String fullName, UserRole role) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(settings.accessTokenTtl());

        String token = Jwts.builder()
                .subject(userId.toString())
                .issuer(settings.issuer())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_NAME, fullName)
                .claim(CLAIM_ROLE, role.name())
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();

        return new IssuedToken(token, expiresAt);
    }

    public AuthenticatedUser verify(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(settings.issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            return new AuthenticatedUser(
                    UUID.fromString(required(claims.getSubject())),
                    claims.get(CLAIM_EMAIL, String.class),
                    claims.get(CLAIM_NAME, String.class),
                    UserRole.valueOf(required(claims.get(CLAIM_ROLE, String.class))));
        } catch (ExpiredJwtException ex) {
            throw new TokenExpiredException();
        } catch (JwtException | IllegalArgumentException ex) {
            throw new TokenInvalidException();
        }
    }

    private static String required(String claim) {
        if (claim == null) {
            throw new TokenInvalidException();
        }
        return claim;
    }

    public record IssuedToken(String value, Instant expiresAt) {
    }

    public static class TokenExpiredException extends RuntimeException {

        public TokenExpiredException() {
            super("Access token expired");
        }
    }

    public static class TokenInvalidException extends RuntimeException {

        public TokenInvalidException() {
            super("Access token is invalid");
        }
    }
}
