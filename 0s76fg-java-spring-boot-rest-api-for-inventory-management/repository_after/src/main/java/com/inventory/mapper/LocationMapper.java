package com.inventory.mapper;

import com.inventory.dto.CreateLocationRequest;
import com.inventory.dto.LocationDto;
import com.inventory.dto.UpdateLocationRequest;
import com.inventory.model.Location;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface LocationMapper {
    LocationDto toDto(Location location);
    
    Location toEntity(CreateLocationRequest request);
    
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(UpdateLocationRequest request, @MappingTarget Location location);
}
