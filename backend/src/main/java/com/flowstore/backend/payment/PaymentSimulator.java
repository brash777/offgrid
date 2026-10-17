package com.flowstore.backend.payment;

import com.flowstore.backend.shared.ApiException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.YearMonth;

@Component
public class PaymentSimulator {

    private static final String DECLINED_SUFFIX = "0002";
    private static final int MIN_DIGITS = 13;
    private static final int MAX_DIGITS = 19;
    private static final int CENTURY = 2000;

    private final Clock clock;

    public PaymentSimulator(Clock clock) {
        this.clock = clock;
    }

    public PaymentStatus decide(CardDetails card) {
        String digits = card.digits();
        if (digits.length() < MIN_DIGITS || digits.length() > MAX_DIGITS || !passesLuhn(digits)) {
            throw ApiException.badRequest("CARD_INVALID");
        }
        if (expiryOf(card).isBefore(YearMonth.now(clock))) {
            throw ApiException.badRequest("CARD_EXPIRED");
        }
        return digits.endsWith(DECLINED_SUFFIX) ? PaymentStatus.REJECTED : PaymentStatus.APPROVED;
    }

    private static YearMonth expiryOf(CardDetails card) {
        String[] parts = card.expiry().split("/");
        return YearMonth.of(CENTURY + Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
    }

    private static boolean passesLuhn(String digits) {
        int sum = 0;
        boolean doubleIt = false;
        for (int index = digits.length() - 1; index >= 0; index--) {
            int digit = digits.charAt(index) - '0';
            if (doubleIt) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
            doubleIt = !doubleIt;
        }
        return sum % 10 == 0;
    }
}
