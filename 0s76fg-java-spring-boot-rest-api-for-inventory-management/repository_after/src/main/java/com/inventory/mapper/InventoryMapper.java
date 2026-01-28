package com.inventory.mapper;

import com.inventory.dto.InventoryDto;
import com.inventory.model.Inventory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {ProductMapper.class, LocationMapper.class})
public interface InventoryMapper {
    InventoryDto toDto(Inventory inventory);
}
