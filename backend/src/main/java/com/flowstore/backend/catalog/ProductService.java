package com.flowstore.backend.catalog;

import com.flowstore.backend.shared.ApiException;
import com.flowstore.backend.shared.FileCategory;
import com.flowstore.backend.shared.FileStorageService;
import com.flowstore.backend.shared.PageResponse;
import com.flowstore.backend.stock.StockService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;
    private final CategoryService categoryService;
    private final StockService stockService;
    private final FileStorageService fileStorageService;
    private final ProductPhotos productPhotos;

    public ProductService(ProductRepository productRepository,
                          ProductVariantRepository variantRepository,
                          ProductImageRepository imageRepository,
                          CategoryService categoryService,
                          StockService stockService,
                          FileStorageService fileStorageService,
                          ProductPhotos productPhotos) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
        this.categoryService = categoryService;
        this.stockService = stockService;
        this.fileStorageService = fileStorageService;
        this.productPhotos = productPhotos;
    }

    @Transactional(readOnly = true)
    public PageResponse<CatalogDtos.ProductSummaryResponse> search(String categorySlug, EquipSlot slot,
                                                                   String text, Pageable pageable) {
        Specification<Product> filters = ProductSpecifications.active();
        if (!isBlank(categorySlug)) {
            filters = filters.and(ProductSpecifications.inCategory(categorySlug.trim()));
        }
        if (slot != null) {
            filters = filters.and(ProductSpecifications.inSlot(slot));
        }
        if (!isBlank(text)) {
            filters = filters.and(ProductSpecifications.nameContains(text.trim()));
        }
        Page<Product> page = productRepository.findAll(filters, pageable);
        List<UUID> productIds = page.getContent().stream().map(Product::getId).toList();
        Map<UUID, ProductPhotos.Photo> photos = productPhotos.firstPhotos(productIds);
        Map<UUID, Long> stockByProduct = stockService.availabilityByProduct(productIds);
        Map<UUID, List<CatalogDtos.ColorResponse>> colorsByProduct = colorsOf(productIds);

        return PageResponse.from(page.map(product -> new CatalogDtos.ProductSummaryResponse(
                product.getId(),
                product.getName(),
                product.getBasePrice(),
                product.getSlot(),
                product.getCategory().getSlug(),
                product.getCategory().getName(),
                photos.getOrDefault(product.getId(), ProductPhotos.Photo.NONE).url(),
                photos.getOrDefault(product.getId(), ProductPhotos.Photo.NONE).color(),
                stockByProduct.getOrDefault(product.getId(), 0L),
                colorsByProduct.getOrDefault(product.getId(), List.of()))));
    }

    @Transactional(readOnly = true)
    public CatalogDtos.ProductDetailResponse getActiveProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND"));
        return toDetail(product);
    }

    @Transactional
    public CatalogDtos.ProductDetailResponse create(CatalogDtos.CreateProductRequest request) {
        Product product = productRepository.save(new Product(
                categoryService.findBySlug(request.categorySlug()),
                request.name().trim(),
                normalizeDescription(request.description()),
                request.basePrice(),
                request.slot()));
        return toDetail(product);
    }

    @Transactional
    public CatalogDtos.ProductDetailResponse update(UUID productId, CatalogDtos.UpdateProductRequest request) {
        Product product = findProduct(productId);
        product.update(
                categoryService.findBySlug(request.categorySlug()),
                request.name().trim(),
                normalizeDescription(request.description()),
                request.basePrice(),
                request.slot(),
                request.active());
        return toDetail(product);
    }

    @Transactional
    public CatalogDtos.VariantResponse addVariant(UUID productId, CatalogDtos.CreateVariantRequest request) {
        Product product = findProduct(productId);
        String size = request.size().trim();
        String colorName = request.colorName().trim();
        String sku = request.sku().trim();

        if (variantRepository.existsBySkuIgnoreCase(sku)) {
            throw ApiException.conflict("SKU_TAKEN");
        }
        if (variantRepository.existsByProductIdAndSizeAndColorName(productId, size, colorName)) {
            throw ApiException.conflict("VARIANT_TAKEN");
        }

        ProductVariant variant = variantRepository.save(new ProductVariant(
                product, size, colorName, request.colorHex().toLowerCase(Locale.ROOT), sku, request.priceOverride()));

        if (request.initialStock() > 0) {
            stockService.restock(variant, request.initialStock());
        }
        return toVariantResponse(variant, request.initialStock());
    }

    @Transactional
    public CatalogDtos.VariantResponse restock(UUID productId, UUID variantId, CatalogDtos.RestockRequest request) {
        ProductVariant variant = variantRepository.findByIdAndProductId(variantId, productId)
                .orElseThrow(() -> ApiException.notFound("VARIANT_NOT_FOUND"));

        stockService.restock(variant, request.quantity());
        return toVariantResponse(variant, stockService.availabilityOf(variantId));
    }

    @Transactional
    public CatalogDtos.ImageResponse addImage(UUID productId, MultipartFile file) {
        Product product = findProduct(productId);
        String path = fileStorageService.store(file, FileCategory.PRODUCT_IMAGE);
        short position = (short) imageRepository.countByProductId(productId);
        imageRepository.save(new ProductImage(product, null, path, position));
        return new CatalogDtos.ImageResponse(fileStorageService.publicUrl(path));
    }

    private CatalogDtos.ProductDetailResponse toDetail(Product product) {
        List<ProductVariant> variants = variantRepository.findByProductIdOrderByColorNameAscSizeAsc(product.getId());
        Map<UUID, Long> stockByVariant = stockService.availabilityByVariant(
                variants.stream().map(ProductVariant::getId).toList());
        List<ProductPhotos.Photo> images = imageRepository.findByProductIdOrderByPositionAsc(product.getId()).stream()
                .map(productPhotos::toPhoto)
                .toList();
        List<String> imageUrls = images.stream().map(ProductPhotos.Photo::url).toList();

        return new CatalogDtos.ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getBasePrice(),
                product.getSlot(),
                product.getCategory().getSlug(),
                product.getCategory().getName(),
                product.isActive(),
                imageUrls,
                images.isEmpty() ? null : images.getFirst().color(),
                variants.stream()
                        .map(variant -> toVariantResponse(variant, stockByVariant.getOrDefault(variant.getId(), 0L)))
                        .toList());
    }

    private Map<UUID, List<CatalogDtos.ColorResponse>> colorsOf(List<UUID> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return variantRepository.findColorsByProductIds(productIds).stream()
                .collect(Collectors.groupingBy(
                        ProductColorView::productId,
                        Collectors.mapping(
                                color -> new CatalogDtos.ColorResponse(color.colorName(), color.colorHex()),
                                Collectors.toList())));
    }

    private static CatalogDtos.VariantResponse toVariantResponse(ProductVariant variant, long availableStock) {
        return new CatalogDtos.VariantResponse(
                variant.getId(),
                variant.getSize(),
                variant.getColorName(),
                variant.getColorHex(),
                variant.getSku(),
                variant.effectivePrice(),
                availableStock);
    }

    private Product findProduct(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> ApiException.notFound("PRODUCT_NOT_FOUND"));
    }

    private static String normalizeDescription(String description) {
        return description == null ? "" : description.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
