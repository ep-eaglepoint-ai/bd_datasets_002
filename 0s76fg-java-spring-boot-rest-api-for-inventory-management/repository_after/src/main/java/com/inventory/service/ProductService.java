package com.inventory.service;

import com.inventory.dto.*;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.mapper.ProductMapper;
import com.inventory.model.Product;
import com.inventory.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductMapper productMapper;

    public ProductService(ProductRepository productRepository, ProductMapper productMapper) {
        this.productRepository = productRepository;
        this.productMapper = productMapper;
    }

    @Transactional(readOnly = true)
    public Page<ProductDto> getAllProducts(String category, String search, Pageable pageable) {
        if (category != null && !category.isEmpty()) {
            return productRepository.findByCategory(category, pageable)
                    .map(productMapper::toDto);
        }
        if (search != null && !search.isEmpty()) {
            return productRepository.findByNameContainingIgnoreCaseOrSkuContainingIgnoreCase(search, search, pageable)
                    .map(productMapper::toDto);
        }
        return productRepository.findAll(pageable)
                .map(productMapper::toDto);
    }

    @Transactional(readOnly = true)
    public ProductDto getProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        return productMapper.toDto(product);
    }

    public ProductDto createProduct(CreateProductRequest request) {
        Product product = productMapper.toEntity(request);
        Product savedProduct = productRepository.save(product);
        return productMapper.toDto(savedProduct);
    }

    public ProductDto updateProduct(Long id, UpdateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        
        productMapper.updateEntityFromDto(request, product);
        Product updatedProduct = productRepository.save(product);
        return productMapper.toDto(updatedProduct);
    }

    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
        
        // Soft delete
        product.setActive(false);
        productRepository.save(product);
    }
}
