package com.flowstore.backend.shared;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private final MessageResolver messages;

    public GlobalExceptionHandler(MessageResolver messages) {
        this.messages = messages;
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiErrorResponse> handleApiException(ApiException ex, HttpServletRequest request) {
        return error(ex.getStatus(), ex.getCode(), request, ex.getArgs());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidBody(MethodArgumentNotValidException ex,
                                                              HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(fieldError -> fields.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage()));
        String code = "VALIDATION_ERROR";
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.withFields(code, messages.error(code), fields, request.getRequestURI()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MultipartException.class})
    public ResponseEntity<ApiErrorResponse> handleUnreadableRequest(HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "MALFORMED_REQUEST", request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex,
                                                               HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_PARAMETER", request, ex.getName());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex,
                                                                   HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", request, ex.getParameterName());
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingPart(MissingServletRequestPartException ex,
                                                              HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "MISSING_PARAMETER", request, ex.getRequestPartName());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotAllowed(HttpServletRequest request) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleUnsupportedMediaType(HttpServletRequest request) {
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleUploadTooLarge(HttpServletRequest request) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "UPLOAD_TOO_LARGE", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataConflict(DataIntegrityViolationException ex,
                                                               HttpServletRequest request) {
        log.warn("Data integrity violation on {} {}: {}",
                request.getMethod(), request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return error(HttpStatus.CONFLICT, "DATA_CONFLICT", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(HttpServletRequest request) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unexpected error on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", request);
    }

    private ResponseEntity<ApiErrorResponse> error(HttpStatus status, String code, HttpServletRequest request,
                                                   Object... args) {
        return ResponseEntity.status(status)
                .body(ApiErrorResponse.of(code, messages.error(code, args), request.getRequestURI()));
    }
}
