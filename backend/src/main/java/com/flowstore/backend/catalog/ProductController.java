package com.flowstore.backend.catalog;

import com.flowstore.backend.shared.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@Tag(name = "Products")
public class ProductController {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Sort DEFAULT_SORT = Sort.by("name");

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @Operation(summary = "Search active products (public)",
            description = "Optional filters: category slug, equip slot and text contained in the name.")
    public PageResponse<CatalogDtos.ProductSummaryResponse> search(
            @RequestParam(required = false) String categorySlug,
            @RequestParam(required = false) EquipSlot slot,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), DEFAULT_SORT);
        return productService.search(categorySlug, slot, search, pageRequest);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get an active product with its variants, stock and images (public)")
    public CatalogDtos.ProductDetailResponse getProduct(@PathVariable UUID id) {
        return productService.getActiveProduct(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a product (ADMIN)")
    public CatalogDtos.ProductDetailResponse create(@Valid @RequestBody CatalogDtos.CreateProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Replace a product (ADMIN)")
    public CatalogDtos.ProductDetailResponse update(@PathVariable UUID id,
                                                    @Valid @RequestBody CatalogDtos.UpdateProductRequest request) {
        return productService.update(id, request);
    }

    @PostMapping("/{id}/variants")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add a size and color to a product (ADMIN)")
    public CatalogDtos.VariantResponse addVariant(@PathVariable UUID id,
                                                  @Valid @RequestBody CatalogDtos.CreateVariantRequest request) {
        return productService.addVariant(id, request);
    }

    @PostMapping("/{id}/variants/{variantId}/restock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Add stock to a variant through a stock movement (ADMIN)")
    public CatalogDtos.VariantResponse restock(@PathVariable UUID id,
                                               @PathVariable UUID variantId,
                                               @Valid @RequestBody CatalogDtos.RestockRequest request) {
        return productService.restock(id, variantId, request);
    }

    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Upload a product image: jpg, png or webp up to 5 MB (ADMIN)")
    public CatalogDtos.ImageResponse addImage(@PathVariable UUID id, @RequestPart("file") MultipartFile file) {
        return productService.addImage(id, file);
    }
}
