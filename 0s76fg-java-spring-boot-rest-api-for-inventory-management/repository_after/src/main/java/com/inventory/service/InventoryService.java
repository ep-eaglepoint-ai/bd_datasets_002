package com.inventory.service;

import com.inventory.dto.*;
import com.inventory.exception.*;
import com.inventory.mapper.InventoryMapper;
import com.inventory.model.*;
import com.inventory.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final StockMovementRepository stockMovementRepository;
    private final InventoryMapper inventoryMapper;

    public InventoryService(InventoryRepository inventoryRepository, ProductRepository productRepository,
                          LocationRepository locationRepository, StockMovementRepository stockMovementRepository,
                          InventoryMapper inventoryMapper) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
        this.locationRepository = locationRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.inventoryMapper = inventoryMapper;
    }

    @Transactional(readOnly = true)
    public Page<InventoryDto> getAllInventory(Pageable pageable) {
        return inventoryRepository.findAll(pageable).map(inventoryMapper::toDto);
    }
    
    @Transactional(readOnly = true)
    public List<InventoryDto> getInventoryByProduct(Long productId) {
        return inventoryRepository.findByProductId(productId).stream().map(inventoryMapper::toDto).toList();
    }
    
    @Transactional(readOnly = true)
    public List<InventoryDto> getInventoryByLocation(Long locationId) {
        return inventoryRepository.findByLocationId(locationId).stream().map(inventoryMapper::toDto).toList();
    }
    
    @Transactional(readOnly = true)
    public List<InventoryDto> getLowStockInventory() {
        return inventoryRepository.findByQuantityLessThanEqualReorderPoint().stream().map(inventoryMapper::toDto).toList();
    }

    @Transactional
    public void receiveStock(ReceiveStockRequest request) {
        Location location = locationRepository.findById(request.getLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Location not found"));

        for (ReceiveStockRequest.ReceiveItem item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + item.getProductId()));

            // Capacity Check
            checkCapacity(location, item.getQuantity());

            Inventory inventory = inventoryRepository.findByProductIdAndLocationId(product.getId(), location.getId())
                    .orElseGet(() -> {
                        Inventory newInv = new Inventory();
                        newInv.setProduct(product);
                        newInv.setLocation(location);
                        newInv.setQuantity(0);
                        newInv.setReservedQuantity(0);
                        newInv.setReorderPoint(0);
                        return newInv;
                    });

            inventory.setQuantity(inventory.getQuantity() + item.getQuantity());
            if (item.getReorderPoint() != null) {
                inventory.setReorderPoint(item.getReorderPoint());
            }
            inventoryRepository.save(inventory);

            // Audit
            createMovement(product, null, location, item.getQuantity(), StockMovement.Type.RECEIPT, 
                         request.getReference(), request.getNotes(), request.getPerformedBy());
        }
    }

    @Transactional
    public void transferStock(TransferStockRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        Location fromLocation = locationRepository.findById(request.getFromLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("From Location not found"));
        
        Location toLocation = locationRepository.findById(request.getToLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("To Location not found"));

        Inventory sourceInv = inventoryRepository.findByProductIdAndLocationId(product.getId(), fromLocation.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Source inventory not found"));

        // Validate available stock
        int available = sourceInv.getQuantity() - sourceInv.getReservedQuantity();
        if (available < request.getQuantity()) {
            throw new InsufficientStockException("Insufficient stock. Available: " + available + ", Requested: " + request.getQuantity());
        }

        // Validate destination capacity
        checkCapacity(toLocation, request.getQuantity());

        // Update Source
        sourceInv.setQuantity(sourceInv.getQuantity() - request.getQuantity());
        inventoryRepository.save(sourceInv);

        // Update Destination
        Inventory destInv = inventoryRepository.findByProductIdAndLocationId(product.getId(), toLocation.getId())
                .orElseGet(() -> {
                    Inventory newInv = new Inventory();
                    newInv.setProduct(product);
                    newInv.setLocation(toLocation);
                    newInv.setQuantity(0);
                    newInv.setReservedQuantity(0);
                    newInv.setReorderPoint(0);
                    return newInv;
                });
        destInv.setQuantity(destInv.getQuantity() + request.getQuantity());
        inventoryRepository.save(destInv);

        // Audit
        createMovement(product, fromLocation, toLocation, request.getQuantity(), StockMovement.Type.TRANSFER,
                     request.getReference(), request.getNotes(), request.getPerformedBy());
    }

    @Transactional
    public void adjustStock(AdjustStockRequest request) {
        Inventory inventory = inventoryRepository.findByProductIdAndLocationId(request.getProductId(), request.getLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Inventory record not found"));

        int newQuantity = inventory.getQuantity() + request.getAdjustmentQuantity();
        if (newQuantity < 0) {
            throw new NegativeQuantityException("Adjustment would result in negative quantity: " + newQuantity);
        }
        
        // If adding stock, check capacity
        if (request.getAdjustmentQuantity() > 0) {
            checkCapacity(inventory.getLocation(), request.getAdjustmentQuantity());
        }

        inventory.setQuantity(newQuantity);
        inventoryRepository.save(inventory);

        // Audit
        // For adjustment, we treat it as internal. 
        // If positive, it's like a receipt (ish) or just ADJ. If negative, also ADJ.
        // We set toLocation or fromLocation based on sign? Or just keep both null?
        // Let's keep both null for simple adjustment or assign location to 'to' if positive, 'from' if negative?
        // Requirement says: "Update inventory quantity, create StockMovement record with type ADJUSTMENT"
        // Let's just set the location involved.
        // Usually adjustment is in-place. Let's set the location as 'toLocation' (where the adjustment happened) 
        // or just leave them null and rely on the fact it's an adjustment? 
        // Most standardized way: If Adding -> toLocation = current. If Removing -> fromLocation = current.
        
        Location from = null;
        Location to = null;
        if (request.getAdjustmentQuantity() < 0) {
            from = inventory.getLocation();
        } else {
            to = inventory.getLocation();
        }
        
        createMovement(inventory.getProduct(), from, to, Math.abs(request.getAdjustmentQuantity()), 
                     StockMovement.Type.ADJUSTMENT, request.getReference(), request.getReason(), request.getPerformedBy());
    }

    private void checkCapacity(Location location, int quantityToAdd) {
        Integer currentTotal = inventoryRepository.calculateTotalStockAtLocation(location.getId());
        if (currentTotal == null) currentTotal = 0;
        
        if (currentTotal + quantityToAdd > location.getCapacity()) {
            throw new CapacityExceededException("Location capacity exceeded. Capacity: " + location.getCapacity() + 
                    ", Current: " + currentTotal + ", Attempting to add: " + quantityToAdd);
        }
    }

    private void createMovement(Product product, Location from, Location to, int qty, StockMovement.Type type, 
                              String ref, String notes, String user) {
        StockMovement movement = new StockMovement();
        movement.setProduct(product);
        movement.setFromLocation(from);
        movement.setToLocation(to);
        movement.setQuantity(qty);
        movement.setType(type);
        movement.setReference(ref);
        movement.setNotes(notes);
        movement.setPerformedBy(user);
        stockMovementRepository.save(movement);
    }
}
