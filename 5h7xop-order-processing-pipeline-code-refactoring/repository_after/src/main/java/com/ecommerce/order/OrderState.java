package com.ecommerce.order;

public enum OrderState {
    PENDING,
    VALIDATED,
    VALIDATION_FAILED,
    CUSTOMER_VERIFIED,
    CUSTOMER_NOT_FOUND,
    CUSTOMER_INACTIVE,
    CUSTOMER_BLOCKED,
    PRICED,
    INVENTORY_RESERVED,
    INSUFFICIENT_INVENTORY,
    INVENTORY_ERROR,
    PENDING_PAYMENT,
    PAYMENT_COMPLETED,
    PAYMENT_FAILED,
    FULFILLMENT_ERROR,
    COMPLETED,
    CANCELLED,
    REFUNDED,
    PARTIALLY_REFUNDED,
    DATABASE_ERROR; // Added to map legacy string errors

    public static OrderState fromString(String status) {
        if (status == null) return null;
        try {
            return valueOf(status);
        } catch (IllegalArgumentException e) {
            // Handle potentially unknown states from legacy DB gracefully or throw
            return PENDING; 
        }
    }
}
