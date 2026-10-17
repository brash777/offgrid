package com.flowstore.backend.auth;

import com.flowstore.backend.config.FlowProperties;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.user.User;
import com.flowstore.backend.user.UserRepository;
import com.flowstore.backend.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int TOKEN_BYTES = 32;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final FlowProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordResetTokenRepository passwordResetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       FlowProperties properties) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
        this.dummyPasswordHash = passwordEncoder.encode(randomToken());
    }

    @Transactional
    public AuthDtos.SessionResponse register(AuthDtos.RegisterRequest request) {
        String email = request.email().trim();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("EMAIL_TAKEN");
        }

        User user = userRepository.save(new User(
                email,
                passwordEncoder.encode(request.password()),
                request.fullName().trim(),
                UserRole.CUSTOMER));

        log.info("User registered: {}", user.getId());
        return openSession(user);
    }

    @Transactional
    public AuthDtos.SessionResponse login(AuthDtos.LoginRequest request) {
        Optional<User> user = userRepository.findByEmailIgnoreCase(request.email().trim());
        String passwordHash = user.map(User::getPasswordHash).orElse(dummyPasswordHash);
        boolean passwordMatches = passwordEncoder.matches(request.password(), passwordHash);

        if (user.isEmpty() || !passwordMatches) {
            throw ApiException.unauthorized("INVALID_CREDENTIALS");
        }
        return openSession(user.get());
    }

    @Transactional
    public AuthDtos.SessionResponse refresh(AuthDtos.RefreshRequest request) {
        RefreshToken stored = refreshTokenRepository.findByTokenHash(sha256(request.refreshToken()))
                .filter(RefreshToken::isUsable)
                .orElseThrow(() -> ApiException.unauthorized("REFRESH_TOKEN_INVALID"));

        stored.revoke();
        return openSession(stored.getUser());
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenRepository.findByTokenHash(sha256(refreshToken)).ifPresent(RefreshToken::revoke);
    }

    @Transactional
    public void requestPasswordReset(AuthDtos.ForgotPasswordRequest request) {
        userRepository.findByEmailIgnoreCase(request.email().trim()).ifPresent(this::issuePasswordResetToken);
    }

    @Transactional
    public void resetPassword(AuthDtos.ResetPasswordRequest request) {
        PasswordResetToken stored = passwordResetTokenRepository.findByTokenHash(sha256(request.token()))
                .filter(PasswordResetToken::isUsable)
                .orElseThrow(() -> ApiException.badRequest("RESET_TOKEN_INVALID"));

        User user = stored.getUser();
        user.changePasswordHash(passwordEncoder.encode(request.newPassword()));
        stored.markUsed();
        int revokedSessions = refreshTokenRepository.revokeAllForUser(user.getId(), OffsetDateTime.now());

        log.info("Password reset for user {}; {} sessions revoked", user.getId(), revokedSessions);
    }

    private void issuePasswordResetToken(User user) {
        OffsetDateTime now = OffsetDateTime.now();
        passwordResetTokenRepository.invalidatePendingForUser(user.getId(), now);

        String token = randomToken();
        passwordResetTokenRepository.save(new PasswordResetToken(
                user, sha256(token), now.plus(properties.passwordReset().tokenTtl())));

        log.debug("Password reset token for user {}: {}", user.getId(), token);
    }

    private AuthDtos.SessionResponse openSession(User user) {
        JwtService.IssuedToken accessToken = jwtService.issueAccessToken(
                user.getId(), user.getEmail(), user.getFullName(), user.getRole());

        String refreshToken = randomToken();
        OffsetDateTime refreshExpiresAt = OffsetDateTime.now().plus(properties.jwt().refreshTokenTtl());
        refreshTokenRepository.save(new RefreshToken(user, sha256(refreshToken), refreshExpiresAt));

        return new AuthDtos.SessionResponse(
                accessToken.value(),
                accessToken.expiresAt(),
                refreshToken,
                refreshExpiresAt.toInstant(),
                AuthDtos.UserResponse.from(user));
    }

    private String randomToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available in this JVM", ex);
        }
    }
}
