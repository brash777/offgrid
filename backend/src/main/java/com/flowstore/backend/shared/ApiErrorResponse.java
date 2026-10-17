package com.flowstore.backend.shared;

import java.time.OffsetDateTime;
import java.util.Map;

public record ApiErrorResponse(
        String code,
        String message,
        Map<String, String> fields,
        String path,
        OffsetDateTime timestamp
) {

    public static ApiErrorResponse of(String code, String message, String path) {
        return new ApiErrorResponse(code, message, null, path, OffsetDateTime.now());
    }

    public static ApiErrorResponse withFields(String code, String message, Map<String, String> fields, String path) {
        return new ApiErrorResponse(code, message, Map.copyOf(fields), path, OffsetDateTime.now());
    }
}
