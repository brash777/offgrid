package com.flowstore.backend.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("""
            UPDATE PasswordResetToken t SET t.usedAt = :now
            WHERE t.user.id = :userId AND t.usedAt IS NULL AND t.expiresAt > :now
            """)
    int invalidatePendingForUser(@Param("userId") UUID userId, @Param("now") OffsetDateTime now);
}
