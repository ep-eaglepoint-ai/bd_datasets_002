package com.inventory.dto;

import jakarta.validation.constraints.*;

public class TransferStockRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "From Location ID is required")
    private Long fromLocationId;

    @NotNull(message = "To Location ID is required")
    private Long toLocationId;

    @Min(value = 1, message = "Quantity must be positive")
    private int quantity;

    @NotBlank(message = "Reference is required")
    private String reference;

    private String notes;

    @NotBlank(message = "Performed by is required")
    private String performedBy;

    // Getters and Setters
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Long getFromLocationId() { return fromLocationId; }
    public void setFromLocationId(Long fromLocationId) { this.fromLocationId = fromLocationId; }
    public Long getToLocationId() { return toLocationId; }
    public void setToLocationId(Long toLocationId) { this.toLocationId = toLocationId; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
