package com.flowstore.backend.payment;

import com.flowstore.backend.shared.ApiException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentSimulatorTest {

    private static final Clock OCTOBER_2026 =
            Clock.fixed(Instant.parse("2026-10-17T15:00:00Z"), ZoneId.of("America/Bogota"));

    private final PaymentSimulator simulator = new PaymentSimulator(OCTOBER_2026);

    @Test
    void theTestCardIsApproved() {
        assertThat(simulator.decide(card("4242 4242 4242 4242", "12/29"))).isEqualTo(PaymentStatus.APPROVED);
    }

    @Test
    void aValidCardEndingIn0002IsRejected() {
        assertThat(simulator.decide(card("4000 0000 0000 0002", "12/29"))).isEqualTo(PaymentStatus.REJECTED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"4242 4242 4242 4241", "1234 5678 9012", "4242424242424242424242"})
    void numbersThatFailTheChecksumOrLengthAreInvalid(String number) {
        assertThatThrownBy(() -> simulator.decide(card(number, "12/29")))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CARD_INVALID"));
    }

    @Test
    void aCardThatExpiredLastMonthIsRejectedButTheCurrentMonthIsValid() {
        assertThatThrownBy(() -> simulator.decide(card("4242 4242 4242 4242", "09/26")))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getCode()).isEqualTo("CARD_EXPIRED"));
        assertThat(simulator.decide(card("4242 4242 4242 4242", "10/26"))).isEqualTo(PaymentStatus.APPROVED);
    }

    @Test
    void theCardNumberNeverAppearsInLogs() {
        assertThat(card("4242 4242 4242 4242", "12/29").toString())
                .doesNotContain("4242 4242")
                .doesNotContain("123")
                .endsWith("****4242]");
    }

    private static CardDetails card(String number, String expiry) {
        return new CardDetails("Ana Prueba", number, expiry, "123");
    }
}
