package com.ecommerce.order.logic;

import com.ecommerce.order.Order;
import com.ecommerce.order.OrderItem;
import java.util.ArrayList;
import java.util.List;

public class OrderValidator {

    public List<String> validate(Order order) {
        List<String> errors = new ArrayList<>();
        if (order == null) {
            errors.add("Order cannot be null");
            return errors;
        }

        if (textIsEmpty(order.getOrderId())) errors.add("Order ID is required");
        if (textIsEmpty(order.getCustomerId())) errors.add("Customer ID is required");
        
        if (order.getItems() == null || order.getItems().isEmpty()) {
            errors.add("Order must contain at least one item");
        } else {
            validateItems(order.getItems(), errors);
        }

        if (textIsEmpty(order.getPaymentMethod())) {
            errors.add("Payment method is required");
        } else {
            validatePaymentMethod(order.getPaymentMethod(), errors);
        }
        
        // Shipping address check
        validateShipping(order, errors);

        return errors;
    }

    private void validateItems(List<OrderItem> items, List<String> errors) {
        for (int i = 0; i < items.size(); i++) {
            OrderItem item = items.get(i);
            if (textIsEmpty(item.getProductId())) errors.add("Item " + (i + 1) + ": Product ID is required");
            if (item.getQuantity() <= 0) errors.add("Item " + (i + 1) + ": Quantity must be positive");
            if (item.getQuantity() > 100) errors.add("Item " + (i + 1) + ": Maximum quantity is 100");
            if (item.getUnitPrice() < 0) errors.add("Item " + (i + 1) + ": Price cannot be negative");
            if (item.getUnitPrice() > 10000) errors.add("Item " + (i + 1) + ": Price exceeds maximum of $10,000");
        }
    }

    private void validatePaymentMethod(String pm, List<String> errors) {
        String upperPm = pm.toUpperCase();
        if (!upperPm.equals("CREDIT_CARD") && !upperPm.equals("DEBIT_CARD") && !upperPm.equals("PAYPAL") 
                && !upperPm.equals("BANK_TRANSFER") && !upperPm.equals("CRYPTO")) {
            errors.add("Unsupported payment method: " + pm);
        }
    }
    
    private void validateShipping(Order order, List<String> errors) {
         if (textIsEmpty(order.getShippingAddress())) {
            boolean hasPhysical = order.getItems() != null && order.getItems().stream().anyMatch(i -> !i.isDigital());
            if (hasPhysical) {
                errors.add("Shipping address is required for physical items");
            }
        }
    }

    private boolean textIsEmpty(String text) {
        return text == null || text.trim().isEmpty();
    }
}
