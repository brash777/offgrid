package com.flowstore.backend.user;

import com.flowstore.backend.shared.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserProfileRepository profileRepository;

    public UserService(UserRepository userRepository, UserProfileRepository profileRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
    }

    @Transactional(readOnly = true)
    public UserDtos.ProfileResponse getProfile(UUID userId) {
        User user = findUser(userId);
        UserProfile profile = profileRepository.findById(userId).orElseGet(() -> new UserProfile(user));
        return UserDtos.ProfileResponse.from(user, profile);
    }

    @Transactional
    public UserDtos.ProfileResponse updateProfile(UUID userId, UserDtos.UpdateProfileRequest request) {
        User user = findUser(userId);
        UserProfile profile = profileRepository.findById(userId)
                .orElseGet(() -> profileRepository.save(new UserProfile(user)));
        profile.update(request.heightCm(), request.build(), request.usualSize());
        return UserDtos.ProfileResponse.from(user, profile);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND"));
    }
}
