package com.flowstore.backend.config;

import com.flowstore.backend.shared.FileCategory;
import com.flowstore.backend.shared.FileStorageService;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.time.Duration;

@Configuration
public class StaticFilesConfig implements WebMvcConfigurer {

    private static final String CATALOG_FOLDER = "catalog";

    private final FlowProperties properties;

    public StaticFilesConfig(FlowProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(FileStorageService.PUBLIC_URL_PREFIX + "/" + CATALOG_FOLDER + "/**")
                .addResourceLocations("classpath:/" + CATALOG_FOLDER + "/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
        Path root = properties.storage().root();
        for (FileCategory category : FileCategory.values()) {
            if (category.isPubliclyServed()) {
                registry.addResourceHandler(FileStorageService.PUBLIC_URL_PREFIX + "/" + category.getFolder() + "/**")
                        .addResourceLocations(directoryLocation(root.resolve(category.getFolder())));
            }
        }
    }

    private static String directoryLocation(Path directory) {
        String uri = directory.toUri().toString();
        return uri.endsWith("/") ? uri : uri + "/";
    }
}
