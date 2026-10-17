package com.flowstore.backend.catalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowstore.backend.auth.JwtAuthenticationFilter;
import com.flowstore.backend.auth.JwtService;
import com.flowstore.backend.config.FlowProperties;
import com.flowstore.backend.config.SecurityConfig;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtService.class,
        ErrorResponseWriter.class, MessageResolver.class})
@EnableConfigurationProperties(FlowProperties.class)
@TestPropertySource(properties = "flow.jwt.secret=" + TestProperties.JWT_SECRET)
class ProductControllerAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProductService productService;

    @Test
    void creatingAProductWithoutATokenIsUnauthenticated() throws Exception {
        mockMvc.perform(post("/api/v1/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductJson()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
        verifyNoInteractions(productService);
    }

    @Test
    void aCustomerCannotCreateProducts() throws Exception {
        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + tokenFor(UserRole.CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductJson()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(productService);
    }

    @Test
    void aCustomerWithAnInvalidBodyIsForbiddenBeforeValidation() throws Exception {
        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + tokenFor(UserRole.CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.fields").doesNotExist());
        verifyNoInteractions(productService);
    }

    @Test
    void aCustomerCannotWriteCategories() throws Exception {
        mockMvc.perform(post("/api/v1/categories")
                        .header("Authorization", "Bearer " + tokenFor(UserRole.CUSTOMER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void anAdminCanCreateProducts() throws Exception {
        when(productService.create(any())).thenReturn(new CatalogDtos.ProductDetailResponse(
                UUID.randomUUID(), "Test shirt", "", new BigDecimal("50000.00"), EquipSlot.TORSO,
                "camisetas", "Camisetas", true, List.of(), List.of()));

        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + tokenFor(UserRole.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createProductJson()))
                .andExpect(status().isCreated());
    }

    @Test
    void anInvalidTokenIsRejectedEvenOnPublicEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/products").header("Authorization", "Bearer not-a-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("TOKEN_INVALID"));
    }

    @Test
    void aMalformedIdIsABadRequestInsteadOfAServerError() throws Exception {
        mockMvc.perform(get("/api/v1/products/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    private String tokenFor(UserRole role) {
        return jwtService.issueAccessToken(UUID.randomUUID(), "test@flowstore.app", "Test", role).value();
    }

    private String createProductJson() throws Exception {
        return objectMapper.writeValueAsString(new CatalogDtos.CreateProductRequest(
                "camisetas", "Test shirt", "", new BigDecimal("50000.00"), EquipSlot.TORSO));
    }
}
