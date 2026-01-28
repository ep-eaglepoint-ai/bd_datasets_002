package com.inventory.dto;

import java.time.LocalDateTime;

public class InventoryDto {
    private Long id;
    private ProductDto product;
    private LocationDto location;
    private int quantity;
    private int reservedQuantity;
    private int reorderPoint;
    private LocalDateTime lastCountedAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public ProductDto getProduct() { return product; }
    public void setProduct(ProductDto product) { this.product = product; }
    public LocationDto getLocation() { return location; }
    public void setLocation(LocationDto location) { this.location = location; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public int getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(int reservedQuantity) { this.reservedQuantity = reservedQuantity; }
    public int getReorderPoint() { return reorderPoint; }
    public void setReorderPoint(int reorderPoint) { this.reorderPoint = reorderPoint; }
    public LocalDateTime getLastCountedAt() { return lastCountedAt; }
    public void setLastCountedAt(LocalDateTime lastCountedAt) { this.lastCountedAt = lastCountedAt; }
}
