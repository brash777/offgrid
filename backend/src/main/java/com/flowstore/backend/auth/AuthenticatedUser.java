package com.flowstore.backend.auth;

import com.flowstore.backend.user.UserRole;

import java.util.UUID;

public record AuthenticatedUser(UUID id, String email, String fullName, UserRole role) {
}
