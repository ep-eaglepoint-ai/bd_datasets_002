package com.ecommerce.order.logic;

import com.ecommerce.order.Order;
import com.ecommerce.order.OrderItem;
import com.ecommerce.order.repository.CustomerRepository;
import java.util.Optional;

public class DiscountCalculator {
    
    private final CustomerRepository customerRepo;

    public DiscountCalculator(CustomerRepository customerRepo) {
        this.customerRepo = customerRepo;
    }

    public double calculateTotalDiscount(Order order) {
        double subtotal = calculateSubtotal(order);
        double discount = 0.0;
        
        discount += calculateQuantityDiscount(order, subtotal);
        discount += calculateCouponDiscount(order, subtotal);
        discount += calculateLoyaltyDiscount(order, subtotal);
        
        // Ensure discount doesn't exceed subtotal
        return Math.min(discount, subtotal);
    }

    private double calculateSubtotal(Order order) {
        if (order.getItems() == null) return 0.0;
        return order.getItems().stream()
            .mapToDouble(item -> item.getQuantity() * item.getUnitPrice())
            .sum();
    }

    private double calculateQuantityDiscount(Order order, double subtotal) {
        if (order.getItems() == null) return 0.0;
        int totalItems = order.getItems().stream().mapToInt(OrderItem::getQuantity).sum();
        
        if (totalItems >= 100) return subtotal * 0.20;
        if (totalItems >= 50) return subtotal * 0.15;
        if (totalItems >= 25) return subtotal * 0.10;
        if (totalItems >= 10) return subtotal * 0.05;
        
        return 0.0;
    }

    private double calculateCouponDiscount(Order order, double subtotal) {
        // In a real refactor, checking the DB for coupons here might be needed,
        // but for now we assume the order or a CouponService provides the details.
        // Since the original code did a DB lookup inside the method, we might need a CouponRepository.
        // For simplicity in this logic class, we'll assume the coupon value/type is resolved or we inject a repo.
        // The original code had complex coupon logic (min amount, expiry). 
        // We will delegate that to a CouponService/Repository in the full implementation.
        // For this step, I'll add a placeholder or simple logic if coupon fields are on Order (they are not fully).
        return 0.0; // Todo: Integrate CouponRepository
    }
    
    private double calculateLoyaltyDiscount(Order order, double subtotal) {
         if (order.getCustomerId() == null) return 0.0;
         // logic using customerRepo to get tier
         String tier = customerRepo.getCustomerTier(order.getCustomerId());
         if (tier == null) return 0.0;
         
         return switch(tier) {
             case "GOLD" -> subtotal * 0.05;
             case "PLATINUM" -> subtotal * 0.10;
             case "DIAMOND" -> subtotal * 0.15;
             default -> 0.0;
         };
    }
}
