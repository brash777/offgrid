package com.flowstore.backend.auth;

import com.flowstore.backend.user.User;
import com.flowstore.backend.user.UserRole;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {
    }

    @Schema(description = "Data to create a customer account")
    public record RegisterRequest(

            @NotBlank(message = "{validation.email.required}")
            @Email(message = "{validation.email.invalid}")
            @Size(max = 255, message = "{validation.email.size}")
            String email,

            @NotBlank(message = "{validation.password.required}")
            @Size(min = 8, max = 72, message = "{validation.password.size}")
            String password,

            @NotBlank(message = "{validation.fullName.required}")
            @Size(max = 120, message = "{validation.fullName.size}")
            String fullName
    ) {
    }

    @Schema(description = "Login credentials")
    public record LoginRequest(

            @NotBlank(message = "{validation.email.required}")
            @Email(message = "{validation.email.invalid}")
            String email,

            @NotBlank(message = "{validation.password.required}")
            @Size(max = 72, message = "{validation.password.max}")
            String password
    ) {
    }

    @Schema(description = "Refresh token issued at login")
    public record RefreshRequest(

            @NotBlank(message = "{validation.token.required}")
            String refreshToken
    ) {
    }

    @Schema(description = "Email that should receive the password reset link")
    public record ForgotPasswordRequest(

            @NotBlank(message = "{validation.email.required}")
            @Email(message = "{validation.email.invalid}")
            String email
    ) {
    }

    @Schema(description = "Password reset token and the new password")
    public record ResetPasswordRequest(

            @NotBlank(message = "{validation.token.required}")
            String token,

            @NotBlank(message = "{validation.password.required}")
            @Size(min = 8, max = 72, message = "{validation.password.size}")
            String newPassword
    ) {
    }

    @Schema(description = "Open session: tokens and user data")
    public record SessionResponse(
            String accessToken,
            Instant accessTokenExpiresAt,
            String refreshToken,
            Instant refreshTokenExpiresAt,
            UserResponse user
    ) {
    }

    @Schema(description = "Public user data")
    public record UserResponse(UUID id, String email, String fullName, UserRole role) {

        public static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getRole());
        }
    }

    @Schema(description = "Plain confirmation message")
    public record MessageResponse(String message) {
    }
}
