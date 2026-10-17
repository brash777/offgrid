package com.flowstore.backend.payment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    public static final String SIMULATED_METHOD = "SIMULATED";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_id", nullable = false, updatable = false)
    private UUID orderId;

    @Column(nullable = false, length = 20)
    private String method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected Payment() {
    }

    private Payment(UUID orderId, PaymentStatus status, OffsetDateTime paidAt) {
        this.orderId = orderId;
        this.method = SIMULATED_METHOD;
        this.status = status;
        this.paidAt = paidAt;
    }

    public static Payment approved(UUID orderId, OffsetDateTime paidAt) {
        return new Payment(orderId, PaymentStatus.APPROVED, paidAt);
    }

    public static Payment rejected(UUID orderId) {
        return new Payment(orderId, PaymentStatus.REJECTED, null);
    }

    public UUID getOrderId() {
        return orderId;
    }

    public String getMethod() {
        return method;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public OffsetDateTime getPaidAt() {
        return paidAt;
    }
}
