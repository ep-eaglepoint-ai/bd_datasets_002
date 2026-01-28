package com.inventory.mapper;

import com.inventory.dto.StockMovementDto;
import com.inventory.model.StockMovement;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface StockMovementMapper {
    @Mapping(source = "product.id", target = "productId")
    @Mapping(source = "product.sku", target = "productSku")
    @Mapping(source = "product.name", target = "productName")
    @Mapping(source = "fromLocation.id", target = "fromLocationId")
    @Mapping(source = "fromLocation.code", target = "fromLocationCode")
    @Mapping(source = "toLocation.id", target = "toLocationId")
    @Mapping(source = "toLocation.code", target = "toLocationCode")
    StockMovementDto toDto(StockMovement stockMovement);
}
