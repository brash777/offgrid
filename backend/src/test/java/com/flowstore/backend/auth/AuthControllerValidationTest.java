package com.flowstore.backend.auth;

import com.flowstore.backend.config.FlowProperties;
import com.flowstore.backend.config.SecurityConfig;
import com.flowstore.backend.shared.ErrorResponseWriter;
import com.flowstore.backend.shared.MessageResolver;
import com.flowstore.backend.support.TestProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class,
        ErrorResponseWriter.class, MessageResolver.class})
@EnableConfigurationProperties(FlowProperties.class)
@TestPropertySource(properties = "flow.jwt.secret=" + TestProperties.JWT_SECRET)
class AuthControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void invalidRegistrationReturnsSpanishFieldErrors() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email": "", "password": "123", "fullName": ""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Hay campos inválidos en la petición."))
                .andExpect(jsonPath("$.fields.email").value("El correo es obligatorio."))
                .andExpect(jsonPath("$.fields.password").value("La contraseña debe tener entre 8 y 72 caracteres."))
                .andExpect(jsonPath("$.fields.fullName").value("El nombre es obligatorio."));
        verifyNoInteractions(authService);
    }

    @Test
    void malformedJsonIsABadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }
}
