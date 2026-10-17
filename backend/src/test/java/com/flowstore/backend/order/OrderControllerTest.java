package com.flowstore.backend.order;

import com.flowstore.backend.auth.JwtAuthenticationFilter;
import com.flowstore.backend.auth.JwtService;
import com.flowstore.backend.config.FlowProperties;
import com.flowstore.backend.config.SecurityConfig;
import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.shared.ErrorResponseWriter;
import com.flowstore.backend.shared.MessageResolver;
import com.flowstore.backend.support.TestProperties;
import com.flowstore.backend.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class,
        ErrorResponseWriter.class, MessageResolver.class})
@EnableConfigurationProperties(FlowProperties.class)
@TestPropertySource(properties = "flow.jwt.secret=" + TestProperties.JWT_SECRET)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private OrderService orderService;

    @Test
    void ordersRequireASession() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        verifyNoInteractions(orderService);
    }

    @Test
    void theOrderIsLookedUpWithTheUserFromTheTokenAndAnotherUsersOrderIsNotFound() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID someoneElsesOrder = UUID.randomUUID();
        when(orderService.getOrder(userId, someoneElsesOrder)).thenThrow(ApiException.notFound("ORDER_NOT_FOUND"));

        mockMvc.perform(get("/api/v1/orders/{id}", someoneElsesOrder)
                        .header("Authorization", "Bearer " + tokenFor(userId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ORDER_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("El pedido no existe."));
        verify(orderService).getOrder(eq(userId), eq(someoneElsesOrder));
    }

    @Test
    void anInvalidCardIsRejectedWithSpanishFieldErrors() throws Exception {
        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + tokenFor(UUID.randomUUID()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payment": {"cardHolder": "", "cardNumber": "4242-abc", "expiry": "13/29", "cvc": "1"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fields['payment.cardHolder']").value("Escribe el nombre que aparece en la tarjeta."))
                .andExpect(jsonPath("$.fields['payment.cardNumber']").value("El número de la tarjeta solo puede tener dígitos."))
                .andExpect(jsonPath("$.fields['payment.expiry']").value("Usa el formato MM/AA, por ejemplo 08/29."))
                .andExpect(jsonPath("$.fields['payment.cvc']").value("El código de seguridad tiene 3 o 4 dígitos."));
        verifyNoInteractions(orderService);
    }

    @Test
    void checkoutUsesTheUserFromTheToken() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/orders")
                        .header("Authorization", "Bearer " + tokenFor(userId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"payment": {"cardHolder": "Ana Prueba", "cardNumber": "4242 4242 4242 4242", "expiry": "12/29", "cvc": "123"}}
                                """))
                .andExpect(status().isCreated());
        verify(orderService).checkout(eq(userId), any());
    }

    private String tokenFor(UUID userId) {
        return jwtService.issueAccessToken(userId, "ana@flowstore.app", "Ana Prueba", UserRole.CUSTOMER).value();
    }
}
