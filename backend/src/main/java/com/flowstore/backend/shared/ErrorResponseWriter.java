package com.flowstore.backend.shared;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Component
public class ErrorResponseWriter {

    private final ObjectMapper objectMapper;
    private final MessageResolver messages;

    public ErrorResponseWriter(ObjectMapper objectMapper, MessageResolver messages) {
        this.objectMapper = objectMapper;
        this.messages = messages;
    }

    public void write(HttpServletRequest request, HttpServletResponse response, HttpStatus status, String code)
            throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(
                response.getWriter(),
                ApiErrorResponse.of(code, messages.error(code), request.getRequestURI()));
    }
}
