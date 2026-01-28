package com.inventory.mapper;

import com.inventory.dto.CreateProductRequest;
import com.inventory.dto.ProductDto;
import com.inventory.dto.UpdateProductRequest;
import com.inventory.model.Product;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ProductMapper {
    ProductDto toDto(Product product);
    
    Product toEntity(CreateProductRequest request);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(UpdateProductRequest request, @MappingTarget Product product);
}
