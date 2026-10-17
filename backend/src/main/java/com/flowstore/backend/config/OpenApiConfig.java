package com.flowstore.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI flowStoreOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("FlowStore API")
                        .version("v1")
                        .description("""
                                Clothing store with a 3D avatar, a virtual fitting room and an AI stylist.

                                To call protected endpoints, log in with POST /api/v1/auth/login,
                                copy the accessToken and paste it into the Authorize button.
                                """))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
