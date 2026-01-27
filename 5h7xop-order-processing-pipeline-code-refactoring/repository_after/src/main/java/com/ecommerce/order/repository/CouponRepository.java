package com.ecommerce.order.repository;

import com.ecommerce.order.model.Coupon; // I might need to create a Coupon model or just return details
import java.util.Optional;

public interface CouponRepository {
    // Defines what we need. For now, let's say it returns a simple object or Map
    // Adapting to what was in the code:
    // type, value, minOrder, maxDiscount, usage details...
    
    Optional<CouponDetails> findByCode(String code);
    void incrementUsage(String code);
    
    record CouponDetails(String type, double value, double minOrderAmount, double maxDiscount, 
                         int usageCount, int usageLimit, java.time.LocalDateTime expiryDate) {}
}
