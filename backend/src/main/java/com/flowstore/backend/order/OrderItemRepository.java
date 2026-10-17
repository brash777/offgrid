package com.flowstore.backend.order;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {

    @EntityGraph(attributePaths = {"order", "productVariant", "productVariant.product", "productVariant.product.category"})
    List<OrderItem> findByOrderIdInOrderByProductNameSnapshotAsc(Collection<UUID> orderIds);
}
