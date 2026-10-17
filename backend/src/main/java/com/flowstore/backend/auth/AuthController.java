package com.flowstore.backend.auth;

import com.flowstore.backend.shared.MessageResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final MessageResolver messages;

    public AuthController(AuthService authService, MessageResolver messages) {
        this.authService = authService;
        this.messages = messages;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a customer account")
    public AuthDtos.SessionResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Log in")
    public AuthDtos.SessionResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange a refresh token for a new session (token rotation)")
    public AuthDtos.SessionResponse refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    @Operation(summary = "Revoke a refresh token")
    public AuthDtos.MessageResponse logout(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        authService.logout(request.refreshToken());
        return new AuthDtos.MessageResponse(messages.resolve("message.LOGGED_OUT"));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset token",
            description = "Always returns the same message so it never reveals which emails are registered.")
    public AuthDtos.MessageResponse forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return new AuthDtos.MessageResponse(messages.resolve("message.PASSWORD_RESET_REQUESTED"));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Set a new password with a reset token")
    public AuthDtos.MessageResponse resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        authService.resetPassword(request);
        return new AuthDtos.MessageResponse(messages.resolve("message.PASSWORD_RESET_DONE"));
    }
}
