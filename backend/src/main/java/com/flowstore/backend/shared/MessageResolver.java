package com.flowstore.backend.shared;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

@Component
public class MessageResolver {

    private static final String ERROR_PREFIX = "error.";

    private final MessageSource messageSource;

    public MessageResolver(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    public String resolve(String key, Object... args) {
        return messageSource.getMessage(key, args, key, LocaleContextHolder.getLocale());
    }

    public String error(String code, Object... args) {
        return resolve(ERROR_PREFIX + code, args);
    }
}
