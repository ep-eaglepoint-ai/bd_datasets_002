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
            case PENDING -> Set.of(OrderState.VALIDATED, OrderState.CANCELLED).contains(next);
            case VALIDATED -> Set.of(OrderState.PRICED, OrderState.CANCELLED).contains(next);
            case PRICED -> Set.of(OrderState.RESERVED, OrderState.CANCELLED).contains(next);
            case RESERVED -> Set.of(OrderState.PENDING_PAYMENT, OrderState.PAID, OrderState.CANCELLED).contains(next);
            case PENDING_PAYMENT -> Set.of(OrderState.PAID, OrderState.PAYMENT_FAILED, OrderState.CANCELLED).contains(next);
            case PAID -> Set.of(OrderState.FULFILLED, OrderState.CANCELLED).contains(next);
            case FULFILLED -> Set.of(OrderState.CANCELLED).contains(next); // Return/Refund scenario
            case PAYMENT_FAILED, CANCELLED -> false; // Terminal states (mostly)
            default -> false; 
        };
    }
}
