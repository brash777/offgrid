package com.flowstore.backend.user;

import com.flowstore.backend.auth.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@Tag(name = "Profile")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @Operation(summary = "Get the authenticated user's profile")
    public UserDtos.ProfileResponse getProfile(@AuthenticationPrincipal AuthenticatedUser user) {
        return userService.getProfile(user.id());
    }

    @PutMapping
    @Operation(summary = "Replace the authenticated user's body measurements")
    public UserDtos.ProfileResponse updateProfile(@AuthenticationPrincipal AuthenticatedUser user,
                                                  @Valid @RequestBody UserDtos.UpdateProfileRequest request) {
        return userService.updateProfile(user.id(), request);
    }
}
