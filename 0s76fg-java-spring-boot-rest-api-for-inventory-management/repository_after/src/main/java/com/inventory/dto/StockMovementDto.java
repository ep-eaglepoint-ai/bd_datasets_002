package com.inventory.dto;

import com.inventory.model.StockMovement;
import java.time.LocalDateTime;

public class StockMovementDto {
    private Long id;
    private Long productId; // Just ID to keep it light, or full dto? Let's use names/codes for readability
    private String productSku;
    private String productName;
    
    private Long fromLocationId;
    private String fromLocationCode;
    
    private Long toLocationId;
    private String toLocationCode;
    
    private int quantity;
    private StockMovement.Type type;
    private String reference;
    private String notes;
    private String performedBy;
    private LocalDateTime performedAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
    public String getProductSku() { return productSku; }
    public void setProductSku(String productSku) { this.productSku = productSku; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    
    public Long getFromLocationId() { return fromLocationId; }
    public void setFromLocationId(Long fromLocationId) { this.fromLocationId = fromLocationId; }
    public String getFromLocationCode() { return fromLocationCode; }
    public void setFromLocationCode(String fromLocationCode) { this.fromLocationCode = fromLocationCode; }
    
    public Long getToLocationId() { return toLocationId; }
    public void setToLocationId(Long toLocationId) { this.toLocationId = toLocationId; }
    public String getToLocationCode() { return toLocationCode; }
    public void setToLocationCode(String toLocationCode) { this.toLocationCode = toLocationCode; }
    
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public StockMovement.Type getType() { return type; }
    public void setType(StockMovement.Type type) { this.type = type; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }
    public LocalDateTime getPerformedAt() { return performedAt; }
    public void setPerformedAt(LocalDateTime performedAt) { this.performedAt = performedAt; }
}
