package com.inventory.dto;

import java.math.BigDecimal;

public class UpdateProductRequest {
    private String name;
    private String description;
    private String category;
    private BigDecimal unitPrice;
    private Boolean active;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
