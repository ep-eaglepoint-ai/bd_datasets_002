package com.ecommerce.order;

public enum OrderState {
    PENDING,
    VALIDATED,
    PRICED,
    RESERVED,
    PAID,
    PENDING_PAYMENT,
    PAYMENT_FAILED,
    FULFILLED,
    CANCELLED;

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
