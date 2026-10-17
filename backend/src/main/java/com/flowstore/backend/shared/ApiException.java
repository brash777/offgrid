package com.flowstore.backend.shared;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final transient Object[] args;

    public ApiException(HttpStatus status, String code, Object... args) {
        super(code);
        this.status = status;
        this.code = code;
        this.args = args.clone();
    }

    public static ApiException badRequest(String code, Object... args) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, args);
    }

    public static ApiException unauthorized(String code) {
        return new ApiException(HttpStatus.UNAUTHORIZED, code);
    }

    public static ApiException notFound(String code) {
        return new ApiException(HttpStatus.NOT_FOUND, code);
    }

    public static ApiException conflict(String code, Object... args) {
        return new ApiException(HttpStatus.CONFLICT, code, args);
    }

    public static ApiException payloadTooLarge(String code, Object... args) {
        return new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, code, args);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Object[] getArgs() {
        return args.clone();
    }
}
