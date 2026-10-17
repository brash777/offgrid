package com.flowstore.backend.auth;

import com.flowstore.backend.config.FlowProperties;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.support.TestProperties;
import com.flowstore.backend.user.User;
import com.flowstore.backend.user.UserRepository;
import com.flowstore.backend.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private AuthService authService;

    @BeforeEach
    void setUp() {
        FlowProperties properties = TestProperties.defaults();
        JwtService jwtService = new JwtService(properties);
        jwtService.initSigningKey();
        authService = new AuthService(userRepository, refreshTokenRepository, passwordResetTokenRepository,
                passwordEncoder, jwtService, properties);
    }

    @Test
    void registerWithTakenEmailFailsWithConflict() {
        when(userRepository.existsByEmailIgnoreCase("ana@flowstore.app")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(
                new AuthDtos.RegisterRequest("ana@flowstore.app", "Password123!", "Ana")))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("EMAIL_TAKEN"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void registerAlwaysCreatesACustomerAndOpensASession() {
        when(userRepository.existsByEmailIgnoreCase("new@flowstore.app")).thenReturn(false);
        when(userRepository.save(any())).thenAnswer(invocation -> withId(invocation.getArgument(0)));

        AuthDtos.SessionResponse session = authService.register(
                new AuthDtos.RegisterRequest("new@flowstore.app", "Password123!", "New Customer"));

        assertThat(session.user().role()).isEqualTo(UserRole.CUSTOMER);
        assertThat(session.accessToken()).isNotBlank();
        assertThat(session.refreshToken()).isNotBlank();
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void loginWithUnknownEmailFailsLikeAWrongPassword() {
        when(userRepository.findByEmailIgnoreCase("ghost@flowstore.app")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest("ghost@flowstore.app", "anything")))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("INVALID_CREDENTIALS"));
    }

    @Test
    void loginWithWrongPasswordFails() {
        User user = persistedUser("ana@flowstore.app", "RightPassword1!", UserRole.CUSTOMER);
        when(userRepository.findByEmailIgnoreCase("ana@flowstore.app")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new AuthDtos.LoginRequest("ana@flowstore.app", "WrongPassword")))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("INVALID_CREDENTIALS"));
    }

    @Test
    void loginWithValidCredentialsOpensASessionWithTheUserRole() {
        User admin = persistedUser("admin@flowstore.app", "Admin123!", UserRole.ADMIN);
        when(userRepository.findByEmailIgnoreCase("admin@flowstore.app")).thenReturn(Optional.of(admin));

        AuthDtos.SessionResponse session = authService.login(
                new AuthDtos.LoginRequest("admin@flowstore.app", "Admin123!"));

        assertThat(session.user().role()).isEqualTo(UserRole.ADMIN);
        assertThat(session.accessToken()).isNotBlank();
    }

    @Test
    void refreshRevokesThePresentedTokenAndIssuesANewOne() {
        User user = persistedUser("ana@flowstore.app", "Password123!", UserRole.CUSTOMER);
        RefreshToken stored = new RefreshToken(user, "stored-hash", OffsetDateTime.now().plusDays(1));
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));

        AuthDtos.SessionResponse session = authService.refresh(new AuthDtos.RefreshRequest("old-token"));

        assertThat(stored.isUsable()).isFalse();
        assertThat(session.refreshToken()).isNotEqualTo("old-token");
    }

    @Test
    void revokedRefreshTokenIsRejected() {
        User user = persistedUser("ana@flowstore.app", "Password123!", UserRole.CUSTOMER);
        RefreshToken stored = new RefreshToken(user, "stored-hash", OffsetDateTime.now().plusDays(1));
        stored.revoke();
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authService.refresh(new AuthDtos.RefreshRequest("old-token")))
                .isInstanceOfSatisfying(ApiException.class,
                        ex -> assertThat(ex.getCode()).isEqualTo("REFRESH_TOKEN_INVALID"));
    }

    private User persistedUser(String email, String password, UserRole role) {
        return withId(new User(email, passwordEncoder.encode(password), "Test User", role));
    }

    private static User withId(User user) {
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        return user;
    }
}
