package com.flowstore.backend.catalog;

import com.flowstore.backend.shared.ApiException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CatalogDtos.CategoryResponse> list() {
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(CatalogDtos.CategoryResponse::from)
                .toList();
    }

    @Transactional
    public CatalogDtos.CategoryResponse create(CatalogDtos.CategoryRequest request) {
        if (categoryRepository.existsBySlug(request.slug())) {
            throw ApiException.conflict("CATEGORY_SLUG_TAKEN");
        }
        Category category = categoryRepository.save(new Category(request.slug(), request.name().trim()));
        return CatalogDtos.CategoryResponse.from(category);
    }

    @Transactional
    public CatalogDtos.CategoryResponse update(UUID categoryId, CatalogDtos.CategoryRequest request) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> ApiException.notFound("CATEGORY_NOT_FOUND"));

        boolean slugChanged = !category.getSlug().equals(request.slug());
        if (slugChanged && categoryRepository.existsBySlug(request.slug())) {
            throw ApiException.conflict("CATEGORY_SLUG_TAKEN");
        }

        category.update(request.slug(), request.name().trim());
        return CatalogDtos.CategoryResponse.from(category);
    }

    Category findBySlug(String slug) {
        return categoryRepository.findBySlug(slug)
                .orElseThrow(() -> ApiException.badRequest("CATEGORY_SLUG_NOT_FOUND", slug));
    }
}
