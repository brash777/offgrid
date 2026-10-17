package com.flowstore.backend.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_profiles")
public class UserProfile {

    @Id
    private UUID userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "height_cm")
    private Short heightCm;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BodyBuild build;

    @Column(name = "usual_size", length = 10)
    private String usualSize;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected UserProfile() {
    }

    public UserProfile(User user) {
        this.user = user;
    }

    public void update(Short heightCm, BodyBuild build, String usualSize) {
        this.heightCm = heightCm;
        this.build = build;
        this.usualSize = usualSize;
    }

    public Short getHeightCm() {
        return heightCm;
    }

    public BodyBuild getBuild() {
        return build;
    }

    public String getUsualSize() {
        return usualSize;
    }
}
