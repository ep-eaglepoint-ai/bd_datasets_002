package com.inventory.service;

import com.inventory.dto.*;
import com.inventory.exception.ResourceNotFoundException;
import com.inventory.mapper.LocationMapper;
import com.inventory.model.Location;
import com.inventory.repository.LocationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class LocationService {

    private final LocationRepository locationRepository;
    private final LocationMapper locationMapper;

    public LocationService(LocationRepository locationRepository, LocationMapper locationMapper) {
        this.locationRepository = locationRepository;
        this.locationMapper = locationMapper;
    }

    @Transactional(readOnly = true)
    public Page<LocationDto> getAllLocations(Pageable pageable) {
        return locationRepository.findAll(pageable)
                .map(locationMapper::toDto);
    }

    @Transactional(readOnly = true)
    public LocationDto getLocation(Long id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found with id: " + id));
        return locationMapper.toDto(location);
    }

    public LocationDto createLocation(CreateLocationRequest request) {
        Location location = locationMapper.toEntity(request);
        Location savedLocation = locationRepository.save(location);
        return locationMapper.toDto(savedLocation);
    }

    public LocationDto updateLocation(Long id, UpdateLocationRequest request) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found with id: " + id));
        
        locationMapper.updateEntityFromDto(request, location);
        Location updatedLocation = locationRepository.save(location);
        return locationMapper.toDto(updatedLocation);
    }
}
