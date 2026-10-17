package com.flowstore.backend.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class UserDtos {

    private UserDtos() {
    }

    @Schema(description = "Account data and body measurements of the authenticated user")
    public record ProfileResponse(
            UUID id,
            String email,
            String fullName,
            UserRole role,
            Short heightCm,
            BodyBuild build,
            String usualSize
    ) {

        public static ProfileResponse from(User user, UserProfile profile) {
            return new ProfileResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole(),
                    profile.getHeightCm(),
                    profile.getBuild(),
                    profile.getUsualSize());
        }
    }

    @Schema(description = "Body measurements used for the avatar and size suggestions")
    public record UpdateProfileRequest(

            @Min(value = 100, message = "{validation.height.min}")
            @Max(value = 230, message = "{validation.height.max}")
            Short heightCm,

            BodyBuild build,

            @Size(max = 10, message = "{validation.usualSize.size}")
            String usualSize
    ) {
    }
}
