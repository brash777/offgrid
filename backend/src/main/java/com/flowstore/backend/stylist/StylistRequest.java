package com.flowstore.backend.stylist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "stylist_requests")
public class StylistRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "with_photo", nullable = false)
    private boolean withPhoto;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected StylistRequest() {
    }

    public StylistRequest(UUID userId, boolean withPhoto) {
        this.userId = userId;
        this.withPhoto = withPhoto;
    }
}
