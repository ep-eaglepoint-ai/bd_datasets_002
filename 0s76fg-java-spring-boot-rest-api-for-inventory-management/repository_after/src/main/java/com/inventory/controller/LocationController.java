package com.inventory.controller;

import com.inventory.dto.*;
import com.inventory.service.LocationService;
import com.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@Tag(name = "Location Management", description = "Endpoints for managing locations")
public class LocationController {

    private final LocationService locationService;
    private final InventoryService inventoryService;

    public LocationController(LocationService locationService, InventoryService inventoryService) {
        this.locationService = locationService;
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @Operation(summary = "List all locations")
    public ResponseEntity<Page<LocationDto>> getAllLocations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(locationService.getAllLocations(pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get location by ID")
    public ResponseEntity<LocationDto> getLocation(@PathVariable Long id) {
        return ResponseEntity.ok(locationService.getLocation(id));
    }

    @PostMapping
    @Operation(summary = "Create a new location")
    public ResponseEntity<LocationDto> createLocation(@Valid @RequestBody CreateLocationRequest request) {
        return new ResponseEntity<>(locationService.createLocation(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing location")
    public ResponseEntity<LocationDto> updateLocation(@PathVariable Long id, @Valid @RequestBody UpdateLocationRequest request) {
        return ResponseEntity.ok(locationService.updateLocation(id, request));
    }

    @GetMapping("/{id}/inventory")
    @Operation(summary = "Get all stock at location")
    public ResponseEntity<List<InventoryDto>> getLocationInventory(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getInventoryByLocation(id));
    }
}
