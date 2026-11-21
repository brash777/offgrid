package com.flowstore.backend.stylist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface StylistRequestRepository extends JpaRepository<StylistRequest, UUID> {

    long countByUserIdAndCreatedAtGreaterThanEqual(UUID userId, OffsetDateTime from);
}
