package com.inventory.dto;

import jakarta.validation.constraints.*;

public class AdjustStockRequest {
    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Location ID is required")
    private Long locationId;

    @NotNull(message = "Adjustment quantity is required")
    // Note: Can be negative
    private Integer adjustmentQuantity;

    @NotBlank(message = "Reference is required")
    private String reference;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotBlank(message = "Performed by is required")
    private String performedBy;

    // Getters and Setters
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public Long getLocationId() { return locationId; }
    public void setLocationId(Long locationId) { this.locationId = locationId; }
    public Integer getAdjustmentQuantity() { return adjustmentQuantity; }
    public void setAdjustmentQuantity(Integer adjustmentQuantity) { this.adjustmentQuantity = adjustmentQuantity; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
}
