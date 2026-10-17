package com.flowstore.backend.payment;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Simulated card. It is only checked, never stored. 4242 4242 4242 4242 is approved and any valid number ending in 0002 is rejected.")
public record CardDetails(

        @NotBlank(message = "{validation.cardHolder.required}")
        @Size(max = 80, message = "{validation.cardHolder.size}")
        String cardHolder,

        @NotBlank(message = "{validation.cardNumber.required}")
        @Pattern(regexp = "^[0-9 ]{12,23}$", message = "{validation.cardNumber.pattern}")
        String cardNumber,

        @NotBlank(message = "{validation.expiry.required}")
        @Pattern(regexp = "^(0[1-9]|1[0-2])/[0-9]{2}$", message = "{validation.expiry.pattern}")
        String expiry,

        @NotBlank(message = "{validation.cvc.required}")
        @Pattern(regexp = "^[0-9]{3,4}$", message = "{validation.cvc.pattern}")
        String cvc
) {

    private static final int VISIBLE_DIGITS = 4;

    public String digits() {
        return cardNumber == null ? "" : cardNumber.replace(" ", "");
    }

    @Override
    public String toString() {
        String digits = digits();
        String lastDigits = digits.length() > VISIBLE_DIGITS ? digits.substring(digits.length() - VISIBLE_DIGITS) : "";
        return "CardDetails[cardNumber=****" + lastDigits + "]";
    }
}
