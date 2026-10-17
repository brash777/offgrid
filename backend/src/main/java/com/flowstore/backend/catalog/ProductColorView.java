package com.flowstore.backend.catalog;

import java.util.UUID;

public record ProductColorView(UUID productId, String colorName, String colorHex) {
}
