package com.ecommerce.order.logic;

import com.ecommerce.order.Order;
import com.ecommerce.order.OrderItem;
import com.ecommerce.order.repository.CustomerRepository;
import com.ecommerce.order.repository.CouponRepository;
import java.time.LocalDateTime;
import java.util.Optional;

public class DiscountCalculator {
    
    private final CustomerRepository customerRepo;
    private final CouponRepository couponRepo;

    public DiscountCalculator(CustomerRepository customerRepo, CouponRepository couponRepo) {
        this.customerRepo = customerRepo;
        this.couponRepo = couponRepo;
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
        if (order.getCouponCode() == null || order.getCouponCode().trim().isEmpty()) {
            return 0.0;
        }
        
        Optional<CouponRepository.CouponDetails> couponOpt = couponRepo.findByCode(order.getCouponCode());
        if (couponOpt.isEmpty()) return 0.0;
        
        CouponRepository.CouponDetails coupon = couponOpt.get();
        
        // Validate coupon
        if (coupon.expiryDate() != null && coupon.expiryDate().isBefore(LocalDateTime.now())) {
            return 0.0; // Expired
        }
        if (coupon.usageLimit() > 0 && coupon.usageCount() >= coupon.usageLimit()) {
            return 0.0; // Usage limit reached
        }
        if (subtotal < coupon.minOrderAmount()) {
            return 0.0; // Minimum order not met
        }
        
        // Calculate discount
        double discount = 0.0;
        if ("PERCENTAGE".equals(coupon.type())) {
            discount = subtotal * (coupon.value() / 100.0);
            if (coupon.maxDiscount() > 0 && discount > coupon.maxDiscount()) {
                discount = coupon.maxDiscount();
            }
        } else if ("FIXED".equals(coupon.type())) {
            discount = coupon.value();
            if (discount > subtotal) {
                discount = subtotal;
            }
        }
        
        return discount;
    }
    
    private double calculateLoyaltyDiscount(Order order, double subtotal) {
         if (order.getCustomerId() == null) return 0.0;
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
