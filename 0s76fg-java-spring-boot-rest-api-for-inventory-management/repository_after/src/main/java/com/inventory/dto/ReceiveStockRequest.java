package com.inventory.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public class ReceiveStockRequest {
    @NotNull(message = "Location ID is required")
    private Long locationId;

    @NotEmpty(message = "Product list cannot be empty")
    private List<ReceiveItem> items;

    @NotBlank(message = "Reference is required")
    private String reference;

    private String notes;

    @NotBlank(message = "Performed by is required")
    private String performedBy;

    // Inner class for items
    public static class ReceiveItem {
        @NotNull(message = "Product ID is required")
        private Long productId;

        @Min(value = 1, message = "Quantity must be positive")
        private int quantity;

        @Min(value = 0, message = "Reorder point cannot be negative")
        private Integer reorderPoint;

        // Getters/Setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public int getQuantity() { return quantity; }
        public void setQuantity(int quantity) { this.quantity = quantity; }
        public Integer getReorderPoint() { return reorderPoint; }
        public void setReorderPoint(Integer reorderPoint) { this.reorderPoint = reorderPoint; }
    }

    // Getters and Setters
    public Long getLocationId() { return locationId; }
    public void setLocationId(Long locationId) { this.locationId = locationId; }
    public List<ReceiveItem> getItems() { return items; }
    public void setItems(List<ReceiveItem> items) { this.items = items; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
