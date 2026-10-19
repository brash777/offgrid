package com.flowstore.backend.catalog;

import com.flowstore.backend.shared.FileStorageService;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class ProductPhotos {

    private final ProductImageRepository imageRepository;
    private final FileStorageService fileStorageService;

    public ProductPhotos(ProductImageRepository imageRepository, FileStorageService fileStorageService) {
        this.imageRepository = imageRepository;
        this.fileStorageService = fileStorageService;
    }

    public Map<UUID, Photo> firstPhotos(Collection<UUID> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return imageRepository.findByProductIdInOrderByPositionAsc(productIds).stream()
                .collect(Collectors.toMap(
                        image -> image.getProduct().getId(),
                        this::toPhoto,
                        (first, ignored) -> first));
    }

    public Photo toPhoto(ProductImage image) {
        return new Photo(fileStorageService.publicUrl(image.getPath()), image.photoColor(), image.photoColorHex());
    }

    public record Photo(String url, String color, String colorHex) {

        public static final Photo NONE = new Photo(null, null, null);
    }
}
