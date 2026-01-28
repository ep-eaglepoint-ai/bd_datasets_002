package com.inventory.controller;

import com.inventory.dto.*;
import com.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@Tag(name = "Inventory Operations", description = "Endpoints for managing stock levels and movements")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @Operation(summary = "List inventory records")
    public ResponseEntity<Page<InventoryDto>> getAllInventory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("desc") ? Sort.by(sortBy).descending() : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(inventoryService.getAllInventory(pageable));
    }

    @GetMapping("/product/{productId}")
    @Operation(summary = "Get stock levels for a product across all locations")
    public ResponseEntity<List<InventoryDto>> getProductInventory(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getInventoryByProduct(productId));
    }

    @GetMapping("/location/{locationId}")
    @Operation(summary = "Get all products at a location")
    public ResponseEntity<List<InventoryDto>> getLocationInventory(@PathVariable Long locationId) {
        return ResponseEntity.ok(inventoryService.getInventoryByLocation(locationId));
    }

    @GetMapping("/low-stock")
    @Operation(summary = "Get items at or below reorder point")
    public ResponseEntity<List<InventoryDto>> getLowStockInventory() {
        return ResponseEntity.ok(inventoryService.getLowStockInventory());
    }

    @PostMapping("/receive")
    @Operation(summary = "Receive shipment (bulk)")
    public ResponseEntity<Void> receiveStock(@Valid @RequestBody ReceiveStockRequest request) {
        inventoryService.receiveStock(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/transfer")
    @Operation(summary = "Transfer stock between locations")
    public ResponseEntity<Void> transferStock(@Valid @RequestBody TransferStockRequest request) {
        inventoryService.transferStock(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/adjust")
    @Operation(summary = "Manual inventory adjustment")
    public ResponseEntity<Void> adjustStock(@Valid @RequestBody AdjustStockRequest request) {
        inventoryService.adjustStock(request);
        return ResponseEntity.ok().build();
    }
}
