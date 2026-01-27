package com.ecommerce.order.logic;

import com.ecommerce.order.OrderState;
import java.util.Set;

public class OrderStateMachine {

    public void validateTransition(OrderState current, OrderState next) {
        if (!isValidTransition(current, next)) {
            throw new IllegalStateException("Invalid state transition from " + current + " to " + next);
        }
    }

    public boolean isValidTransition(OrderState current, OrderState next) {
        if (current == null || next == null) return false;
        if (current == next) return true; // Self transition sometimes ok, or check strictness

        return switch (current) {
            case PENDING -> Set.of(OrderState.VALIDATED, OrderState.VALIDATION_FAILED, OrderState.CANCELLED).contains(next);
            case VALIDATED -> Set.of(OrderState.CUSTOMER_VERIFIED, OrderState.CUSTOMER_NOT_FOUND, 
                                   OrderState.CUSTOMER_INACTIVE, OrderState.CUSTOMER_BLOCKED, OrderState.CANCELLED, OrderState.DATABASE_ERROR).contains(next);
            case CUSTOMER_VERIFIED -> Set.of(OrderState.PRICED, OrderState.CANCELLED).contains(next);
            case PRICED -> Set.of(OrderState.INVENTORY_RESERVED, OrderState.INSUFFICIENT_INVENTORY, 
                                OrderState.INVENTORY_ERROR, OrderState.CANCELLED, OrderState.DATABASE_ERROR).contains(next);
            case INVENTORY_RESERVED -> Set.of(OrderState.PAYMENT_COMPLETED, OrderState.PAYMENT_FAILED, OrderState.CANCELLED, OrderState.PENDING_PAYMENT).contains(next);
            case PENDING_PAYMENT -> Set.of(OrderState.PAYMENT_COMPLETED, OrderState.PAYMENT_FAILED, OrderState.CANCELLED).contains(next);
            case PAYMENT_COMPLETED -> Set.of(OrderState.COMPLETED, OrderState.FULFILLMENT_ERROR, OrderState.REFUNDED).contains(next);
            case COMPLETED -> Set.of(OrderState.REFUNDED, OrderState.PARTIALLY_REFUNDED).contains(next);
            case CANCELLED, REFUNDED -> false; // Terminal states
            default -> false; 
        };
    }
}
