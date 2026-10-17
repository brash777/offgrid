package com.flowstore.backend.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<CustomerOrder, UUID> {

    Optional<CustomerOrder> findByIdAndUserId(UUID id, UUID userId);

    Page<CustomerOrder> findByUserId(UUID userId, Pageable pageable);
}
