package com.ecommerce.order;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Legacy Order Processing System
 * 
 * WARNING: This class has grown organically over 5 years and needs refactoring.
 * Known issues:
 * - High cyclomatic complexity
 * - Duplicated discount logic
 * - Magic numbers everywhere
 * - Tight coupling to database and payment gateway
 * - Adding new payment methods requires changes in 15+ places
 */
public class OrderProcessor {
    
    private Connection dbConnection;
    private String paymentGatewayUrl;
    private String paymentApiKey;
    private Map<String, Integer> inventoryCache;
    
    public OrderProcessor(Connection dbConnection, String paymentGatewayUrl, String paymentApiKey) {
        this.dbConnection = dbConnection;
        this.paymentGatewayUrl = paymentGatewayUrl;
        this.paymentApiKey = paymentApiKey;
        this.inventoryCache = new HashMap<>();
    }
    
    /**
     * Main order processing method - processes order through all stages
     */
    public OrderResult processOrder(Order order) {
        List<String> errors = new ArrayList<>();
        
        // ============== STAGE 1: VALIDATION ==============
        if (order == null) {
            return OrderResult.failure("Order cannot be null");
        }
        
        if (order.getOrderId() == null || order.getOrderId().trim().isEmpty()) {
            errors.add("Order ID is required");
        }
        
        if (order.getCustomerId() == null || order.getCustomerId().trim().isEmpty()) {
            errors.add("Customer ID is required");
        }
        
        if (order.getItems() == null || order.getItems().isEmpty()) {
            errors.add("Order must contain at least one item");
        }
        
        if (order.getPaymentMethod() == null || order.getPaymentMethod().trim().isEmpty()) {
            errors.add("Payment method is required");
        }
        
        if (order.getShippingAddress() == null || order.getShippingAddress().trim().isEmpty()) {
            boolean hasDigitalOnly = true;
            if (order.getItems() != null) {
                for (OrderItem item : order.getItems()) {
                    if (!item.isDigital()) {
                        hasDigitalOnly = false;
                        break;
                    }
                }
            }
            if (!hasDigitalOnly) {
                errors.add("Shipping address is required for physical items");
            }
        }
        
        // Validate payment method is supported
        if (order.getPaymentMethod() != null) {
            String pm = order.getPaymentMethod().toUpperCase();
            if (!pm.equals("CREDIT_CARD") && !pm.equals("DEBIT_CARD") && !pm.equals("PAYPAL") 
                && !pm.equals("BANK_TRANSFER") && !pm.equals("CRYPTO")) {
                errors.add("Unsupported payment method: " + order.getPaymentMethod());
            }
        }
        
        // Validate items
        if (order.getItems() != null) {
            for (int i = 0; i < order.getItems().size(); i++) {
                OrderItem item = order.getItems().get(i);
                if (item.getProductId() == null || item.getProductId().trim().isEmpty()) {
                    errors.add("Item " + (i + 1) + ": Product ID is required");
                }
                if (item.getQuantity() <= 0) {
                    errors.add("Item " + (i + 1) + ": Quantity must be positive");
                }
                if (item.getQuantity() > 100) {
                    errors.add("Item " + (i + 1) + ": Maximum quantity is 100");
                }
                if (item.getUnitPrice() < 0) {
                    errors.add("Item " + (i + 1) + ": Price cannot be negative");
                }
                if (item.getUnitPrice() > 10000) {
                    errors.add("Item " + (i + 1) + ": Price exceeds maximum of $10,000");
                }
            }
        }
        
        if (!errors.isEmpty()) {
            order.setStatus("VALIDATION_FAILED");
            return OrderResult.failure("Validation failed", errors);
        }
        
        order.setStatus("VALIDATED");
        
        // ============== STAGE 2: CUSTOMER VERIFICATION ==============
        try {
            PreparedStatement stmt = dbConnection.prepareStatement(
                "SELECT customer_id, email, is_active, is_blocked, credit_limit, current_balance " +
                "FROM customers WHERE customer_id = ?"
            );
            stmt.setString(1, order.getCustomerId());
            ResultSet rs = stmt.executeQuery();
            
            if (!rs.next()) {
                order.setStatus("CUSTOMER_NOT_FOUND");
                return OrderResult.failure("Customer not found: " + order.getCustomerId());
            }
            
            boolean isActive = rs.getBoolean("is_active");
            boolean isBlocked = rs.getBoolean("is_blocked");
            double creditLimit = rs.getDouble("credit_limit");
            double currentBalance = rs.getDouble("current_balance");
            
            if (!isActive) {
                order.setStatus("CUSTOMER_INACTIVE");
                return OrderResult.failure("Customer account is inactive");
            }
            
            if (isBlocked) {
                order.setStatus("CUSTOMER_BLOCKED");
                return OrderResult.failure("Customer account is blocked");
            }
            
            rs.close();
            stmt.close();
        } catch (SQLException e) {
            order.setStatus("DATABASE_ERROR");
            return OrderResult.failure("Database error during customer verification: " + e.getMessage());
        }
        
        order.setStatus("CUSTOMER_VERIFIED");
        
        // ============== STAGE 3: PRICING CALCULATION ==============
        double subtotal = 0;
        for (OrderItem item : order.getItems()) {
            subtotal += item.getQuantity() * item.getUnitPrice();
        }
        
        // Apply quantity discounts (DUPLICATED LOGIC #1)
        double quantityDiscount = 0;
        int totalItems = 0;
        for (OrderItem item : order.getItems()) {
            totalItems += item.getQuantity();
        }
        if (totalItems >= 10 && totalItems < 25) {
            quantityDiscount = subtotal * 0.05; // 5% discount
        } else if (totalItems >= 25 && totalItems < 50) {
            quantityDiscount = subtotal * 0.10; // 10% discount
        } else if (totalItems >= 50 && totalItems < 100) {
            quantityDiscount = subtotal * 0.15; // 15% discount
        } else if (totalItems >= 100) {
            quantityDiscount = subtotal * 0.20; // 20% discount
        }
        
        // Apply coupon discount
        double couponDiscount = 0;
        if (order.getCouponCode() != null && !order.getCouponCode().trim().isEmpty()) {
            try {
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT discount_type, discount_value, min_order_amount, max_discount, " +
                    "usage_count, usage_limit, expiry_date FROM coupons WHERE code = ? AND is_active = true"
                );
                stmt.setString(1, order.getCouponCode());
                ResultSet rs = stmt.executeQuery();
                
                if (rs.next()) {
                    String discountType = rs.getString("discount_type");
                    double discountValue = rs.getDouble("discount_value");
                    double minOrderAmount = rs.getDouble("min_order_amount");
                    double maxDiscount = rs.getDouble("max_discount");
                    int usageCount = rs.getInt("usage_count");
                    int usageLimit = rs.getInt("usage_limit");
                    Timestamp expiryDate = rs.getTimestamp("expiry_date");
                    
                    // Check if coupon is valid
                    if (expiryDate != null && expiryDate.toLocalDateTime().isBefore(LocalDateTime.now())) {
                        // Coupon expired - ignore silently
                    } else if (usageLimit > 0 && usageCount >= usageLimit) {
                        // Usage limit reached - ignore silently
                    } else if (subtotal < minOrderAmount) {
                        // Minimum order not met - ignore silently
                    } else {
                        // Apply discount (DUPLICATED LOGIC #2)
                        if (discountType.equals("PERCENTAGE")) {
                            couponDiscount = subtotal * (discountValue / 100.0);
                            if (maxDiscount > 0 && couponDiscount > maxDiscount) {
                                couponDiscount = maxDiscount;
                            }
                        } else if (discountType.equals("FIXED")) {
                            couponDiscount = discountValue;
                            if (couponDiscount > subtotal) {
                                couponDiscount = subtotal;
                            }
                        } else if (discountType.equals("FREE_SHIPPING")) {
                            // Handled later in shipping calculation
                        }
                    }
                }
                rs.close();
                stmt.close();
            } catch (SQLException e) {
                // Log error but continue without coupon
                System.err.println("Coupon lookup failed: " + e.getMessage());
            }
        }
        
        // Apply loyalty discount (DUPLICATED LOGIC #3)
        double loyaltyDiscount = 0;
        try {
            PreparedStatement stmt = dbConnection.prepareStatement(
                "SELECT loyalty_points, loyalty_tier FROM customers WHERE customer_id = ?"
            );
            stmt.setString(1, order.getCustomerId());
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                int loyaltyPoints = rs.getInt("loyalty_points");
                String loyaltyTier = rs.getString("loyalty_tier");
                
                // Tier-based discount
                if (loyaltyTier != null) {
                    if (loyaltyTier.equals("GOLD")) {
                        loyaltyDiscount = subtotal * 0.05; // 5%
                    } else if (loyaltyTier.equals("PLATINUM")) {
                        loyaltyDiscount = subtotal * 0.10; // 10%
                    } else if (loyaltyTier.equals("DIAMOND")) {
                        loyaltyDiscount = subtotal * 0.15; // 15%
                    }
                }
            }
            rs.close();
            stmt.close();
        } catch (SQLException e) {
            System.err.println("Loyalty lookup failed: " + e.getMessage());
        }
        
        // Calculate shipping (DUPLICATED LOGIC #4 - same discount tiers)
        double shippingCost = 0;
        boolean hasFreeShipping = false;
        double totalWeight = 0;
        boolean hasPhysicalItems = false;
        
        for (OrderItem item : order.getItems()) {
            if (!item.isDigital()) {
                hasPhysicalItems = true;
                totalWeight += item.getWeight() * item.getQuantity();
            }
        }
        
        if (hasPhysicalItems) {
            // Base shipping rates
            if (totalWeight <= 1) {
                shippingCost = 5.99;
            } else if (totalWeight <= 5) {
                shippingCost = 9.99;
            } else if (totalWeight <= 10) {
                shippingCost = 14.99;
            } else if (totalWeight <= 25) {
                shippingCost = 24.99;
            } else {
                shippingCost = 24.99 + ((totalWeight - 25) * 0.50);
            }
            
            // Priority shipping surcharge
            if (order.isPriority()) {
                shippingCost *= 1.5;
            }
            
            // Free shipping threshold
            if (subtotal >= 100) {
                hasFreeShipping = true;
                shippingCost = 0;
            }
        }
        
        // Calculate tax
        double taxRate = 0.08; // 8% default tax
        double taxAmount = (subtotal - quantityDiscount - couponDiscount - loyaltyDiscount) * taxRate;
        if (taxAmount < 0) taxAmount = 0;
        
        // Calculate final amount
        double totalDiscount = quantityDiscount + couponDiscount + loyaltyDiscount;
        double finalAmount = subtotal - totalDiscount + shippingCost + taxAmount;
        if (finalAmount < 0) finalAmount = 0;
        
        order.setDiscountAmount(totalDiscount);
        order.setTotalAmount(finalAmount);
        order.setStatus("PRICED");
        
        // ============== STAGE 4: INVENTORY CHECK ==============
        try {
            for (OrderItem item : order.getItems()) {
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT quantity_available, reserved_quantity FROM inventory WHERE product_id = ?"
                );
                stmt.setString(1, item.getProductId());
                ResultSet rs = stmt.executeQuery();
                
                if (!rs.next()) {
                    order.setStatus("INVENTORY_ERROR");
                    return OrderResult.failure("Product not found in inventory: " + item.getProductId());
                }
                
                int available = rs.getInt("quantity_available");
                int reserved = rs.getInt("reserved_quantity");
                int actualAvailable = available - reserved;
                
                if (actualAvailable < item.getQuantity()) {
                    order.setStatus("INSUFFICIENT_INVENTORY");
                    return OrderResult.failure("Insufficient inventory for product: " + item.getProductId() + 
                        ". Requested: " + item.getQuantity() + ", Available: " + actualAvailable);
                }
                
                rs.close();
                stmt.close();
            }
            
            // Reserve inventory
            for (OrderItem item : order.getItems()) {
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "UPDATE inventory SET reserved_quantity = reserved_quantity + ? WHERE product_id = ?"
                );
                stmt.setInt(1, item.getQuantity());
                stmt.setString(2, item.getProductId());
                stmt.executeUpdate();
                stmt.close();
            }
        } catch (SQLException e) {
            order.setStatus("DATABASE_ERROR");
            return OrderResult.failure("Database error during inventory check: " + e.getMessage());
        }
        
        order.setStatus("INVENTORY_RESERVED");
        
        // ============== STAGE 5: PAYMENT PROCESSING ==============
        String transactionId = null;
        boolean paymentSuccess = false;
        String paymentError = null;
        
        try {
            String pm = order.getPaymentMethod().toUpperCase();
            
            if (pm.equals("CREDIT_CARD")) {
                // Process credit card payment
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT card_token, card_last_four, card_expiry FROM customer_payment_methods " +
                    "WHERE customer_id = ? AND method_type = 'CREDIT_CARD' AND is_default = true"
                );
                stmt.setString(1, order.getCustomerId());
                ResultSet rs = stmt.executeQuery();
                
                if (!rs.next()) {
                    paymentError = "No default credit card on file";
                } else {
                    String cardToken = rs.getString("card_token");
                    String cardExpiry = rs.getString("card_expiry");
                    
                    // Check expiry
                    if (cardExpiry != null) {
                        String[] parts = cardExpiry.split("/");
                        if (parts.length == 2) {
                            int expMonth = Integer.parseInt(parts[0]);
                            int expYear = Integer.parseInt(parts[1]) + 2000;
                            LocalDateTime now = LocalDateTime.now();
                            if (expYear < now.getYear() || (expYear == now.getYear() && expMonth < now.getMonthValue())) {
                                paymentError = "Credit card has expired";
                            }
                        }
                    }
                    
                    if (paymentError == null) {
                        // Simulate payment gateway call
                        transactionId = processPaymentGateway("CREDIT_CARD", cardToken, finalAmount);
                        if (transactionId != null) {
                            paymentSuccess = true;
                        } else {
                            paymentError = "Payment gateway declined the transaction";
                        }
                    }
                }
                rs.close();
                stmt.close();
                
            } else if (pm.equals("DEBIT_CARD")) {
                // Process debit card payment - almost same as credit card
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT card_token, card_last_four, card_expiry FROM customer_payment_methods " +
                    "WHERE customer_id = ? AND method_type = 'DEBIT_CARD' AND is_default = true"
                );
                stmt.setString(1, order.getCustomerId());
                ResultSet rs = stmt.executeQuery();
                
                if (!rs.next()) {
                    paymentError = "No default debit card on file";
                } else {
                    String cardToken = rs.getString("card_token");
                    String cardExpiry = rs.getString("card_expiry");
                    
                    // Check expiry - DUPLICATED from credit card
                    if (cardExpiry != null) {
                        String[] parts = cardExpiry.split("/");
                        if (parts.length == 2) {
                            int expMonth = Integer.parseInt(parts[0]);
                            int expYear = Integer.parseInt(parts[1]) + 2000;
                            LocalDateTime now = LocalDateTime.now();
                            if (expYear < now.getYear() || (expYear == now.getYear() && expMonth < now.getMonthValue())) {
                                paymentError = "Debit card has expired";
                            }
                        }
                    }
                    
                    if (paymentError == null) {
                        transactionId = processPaymentGateway("DEBIT_CARD", cardToken, finalAmount);
                        if (transactionId != null) {
                            paymentSuccess = true;
                        } else {
                            paymentError = "Payment gateway declined the transaction";
                        }
                    }
                }
                rs.close();
                stmt.close();
                
            } else if (pm.equals("PAYPAL")) {
                // Process PayPal payment
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT paypal_email, paypal_token FROM customer_payment_methods " +
                    "WHERE customer_id = ? AND method_type = 'PAYPAL' AND is_default = true"
                );
                stmt.setString(1, order.getCustomerId());
                ResultSet rs = stmt.executeQuery();
                
                if (!rs.next()) {
                    paymentError = "No PayPal account linked";
                } else {
                    String paypalToken = rs.getString("paypal_token");
                    transactionId = processPaymentGateway("PAYPAL", paypalToken, finalAmount);
                    if (transactionId != null) {
                        paymentSuccess = true;
                    } else {
                        paymentError = "PayPal payment failed";
                    }
                }
                rs.close();
                stmt.close();
                
            } else if (pm.equals("BANK_TRANSFER")) {
                // Process bank transfer - requires manual verification
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT bank_account_token FROM customer_payment_methods " +
                    "WHERE customer_id = ? AND method_type = 'BANK_TRANSFER' AND is_default = true"
                );
                stmt.setString(1, order.getCustomerId());
                ResultSet rs = stmt.executeQuery();
                
                if (!rs.next()) {
                    paymentError = "No bank account on file";
                } else {
                    String bankToken = rs.getString("bank_account_token");
                    transactionId = processPaymentGateway("BANK_TRANSFER", bankToken, finalAmount);
                    if (transactionId != null) {
                        paymentSuccess = true;
                    } else {
                        paymentError = "Bank transfer initiation failed";
                    }
                }
                rs.close();
                stmt.close();
                
            } else if (pm.equals("CRYPTO")) {
                // Process crypto payment
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "SELECT crypto_wallet_address FROM customer_payment_methods " +
                    "WHERE customer_id = ? AND method_type = 'CRYPTO' AND is_default = true"
                );
                stmt.setString(1, order.getCustomerId());
                ResultSet rs = stmt.executeQuery();
                
                if (!rs.next()) {
                    paymentError = "No crypto wallet linked";
                } else {
                    String walletAddress = rs.getString("crypto_wallet_address");
                    transactionId = processPaymentGateway("CRYPTO", walletAddress, finalAmount);
                    if (transactionId != null) {
                        paymentSuccess = true;
                    } else {
                        paymentError = "Crypto payment failed";
                    }
                }
                rs.close();
                stmt.close();
            }
            
        } catch (SQLException e) {
            paymentError = "Database error during payment processing: " + e.getMessage();
        } catch (Exception e) {
            paymentError = "Payment processing error: " + e.getMessage();
        }
        
        if (!paymentSuccess) {
            // Rollback inventory reservation
            try {
                for (OrderItem item : order.getItems()) {
                    PreparedStatement stmt = dbConnection.prepareStatement(
                        "UPDATE inventory SET reserved_quantity = reserved_quantity - ? WHERE product_id = ?"
                    );
                    stmt.setInt(1, item.getQuantity());
                    stmt.setString(2, item.getProductId());
                    stmt.executeUpdate();
                    stmt.close();
                }
            } catch (SQLException e) {
                System.err.println("Failed to rollback inventory: " + e.getMessage());
            }
            
            order.setStatus("PAYMENT_FAILED");
            return OrderResult.failure("Payment failed: " + paymentError);
        }
        
        order.setStatus("PAYMENT_COMPLETED");
        
        // ============== STAGE 6: FULFILLMENT ==============
        try {
            // Deduct inventory
            for (OrderItem item : order.getItems()) {
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "UPDATE inventory SET quantity_available = quantity_available - ?, " +
                    "reserved_quantity = reserved_quantity - ? WHERE product_id = ?"
                );
                stmt.setInt(1, item.getQuantity());
                stmt.setInt(2, item.getQuantity());
                stmt.setString(3, item.getProductId());
                stmt.executeUpdate();
                stmt.close();
            }
            
            // Create order record
            PreparedStatement stmt = dbConnection.prepareStatement(
                "INSERT INTO orders (order_id, customer_id, status, subtotal, discount_amount, " +
                "shipping_cost, tax_amount, total_amount, payment_method, transaction_id, " +
                "shipping_address, billing_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            stmt.setString(1, order.getOrderId());
            stmt.setString(2, order.getCustomerId());
            stmt.setString(3, "COMPLETED");
            stmt.setDouble(4, subtotal);
            stmt.setDouble(5, totalDiscount);
            stmt.setDouble(6, shippingCost);
            stmt.setDouble(7, taxAmount);
            stmt.setDouble(8, finalAmount);
            stmt.setString(9, order.getPaymentMethod());
            stmt.setString(10, transactionId);
            stmt.setString(11, order.getShippingAddress());
            stmt.setString(12, order.getBillingAddress());
            stmt.setTimestamp(13, Timestamp.valueOf(LocalDateTime.now()));
            stmt.executeUpdate();
            stmt.close();
            
            // Create order items records
            for (OrderItem item : order.getItems()) {
                stmt = dbConnection.prepareStatement(
                    "INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal) " +
                    "VALUES (?, ?, ?, ?, ?, ?)"
                );
                stmt.setString(1, order.getOrderId());
                stmt.setString(2, item.getProductId());
                stmt.setString(3, item.getProductName());
                stmt.setInt(4, item.getQuantity());
                stmt.setDouble(5, item.getUnitPrice());
                stmt.setDouble(6, item.getSubtotal());
                stmt.executeUpdate();
                stmt.close();
            }
            
            // Update coupon usage
            if (order.getCouponCode() != null && !order.getCouponCode().trim().isEmpty() && couponDiscount > 0) {
                stmt = dbConnection.prepareStatement(
                    "UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?"
                );
                stmt.setString(1, order.getCouponCode());
                stmt.executeUpdate();
                stmt.close();
            }
            
            // Update loyalty points
            int pointsEarned = (int) (finalAmount * 10); // 10 points per dollar
            stmt = dbConnection.prepareStatement(
                "UPDATE customers SET loyalty_points = loyalty_points + ? WHERE customer_id = ?"
            );
            stmt.setInt(1, pointsEarned);
            stmt.setString(2, order.getCustomerId());
            stmt.executeUpdate();
            stmt.close();
            
        } catch (SQLException e) {
            order.setStatus("FULFILLMENT_ERROR");
            return OrderResult.failure("Fulfillment error: " + e.getMessage());
        }
        
        order.setStatus("COMPLETED");
        
        // Build success result
        OrderResult result = OrderResult.success(order.getOrderId(), "Order processed successfully");
        result.setFinalAmount(finalAmount);
        result.setTransactionId(transactionId);
        
        return result;
    }
    
    /**
     * Simulate payment gateway call
     */
    private String processPaymentGateway(String paymentType, String token, double amount) {
        // In real implementation, this would call external payment gateway
        // For now, simulate success
        return "TXN_" + System.currentTimeMillis();
    }
    
    /**
     * Calculate discount for display purposes - DUPLICATED LOGIC
     */
    public double calculateOrderDiscount(Order order) {
        if (order == null || order.getItems() == null) {
            return 0;
        }
        
        double subtotal = 0;
        for (OrderItem item : order.getItems()) {
            subtotal += item.getQuantity() * item.getUnitPrice();
        }
        
        // Quantity discount - SAME AS IN processOrder
        double quantityDiscount = 0;
        int totalItems = 0;
        for (OrderItem item : order.getItems()) {
            totalItems += item.getQuantity();
        }
        if (totalItems >= 10 && totalItems < 25) {
            quantityDiscount = subtotal * 0.05;
        } else if (totalItems >= 25 && totalItems < 50) {
            quantityDiscount = subtotal * 0.10;
        } else if (totalItems >= 50 && totalItems < 100) {
            quantityDiscount = subtotal * 0.15;
        } else if (totalItems >= 100) {
            quantityDiscount = subtotal * 0.20;
        }
        
        return quantityDiscount;
    }
    
    /**
     * Validate order status transition
     */
    public boolean canTransitionTo(Order order, String newStatus) {
        if (order == null || order.getStatus() == null || newStatus == null) {
            return false;
        }
        
        String current = order.getStatus();
        
        // Messy state transition logic scattered here
        if (current.equals("PENDING")) {
            return newStatus.equals("VALIDATED") || newStatus.equals("VALIDATION_FAILED") || newStatus.equals("CANCELLED");
        } else if (current.equals("VALIDATED")) {
            return newStatus.equals("CUSTOMER_VERIFIED") || newStatus.equals("CUSTOMER_NOT_FOUND") || 
                   newStatus.equals("CUSTOMER_INACTIVE") || newStatus.equals("CUSTOMER_BLOCKED") || newStatus.equals("CANCELLED");
        } else if (current.equals("CUSTOMER_VERIFIED")) {
            return newStatus.equals("PRICED") || newStatus.equals("CANCELLED");
        } else if (current.equals("PRICED")) {
            return newStatus.equals("INVENTORY_RESERVED") || newStatus.equals("INSUFFICIENT_INVENTORY") || 
                   newStatus.equals("INVENTORY_ERROR") || newStatus.equals("CANCELLED");
        } else if (current.equals("INVENTORY_RESERVED")) {
            return newStatus.equals("PAYMENT_COMPLETED") || newStatus.equals("PAYMENT_FAILED") || newStatus.equals("CANCELLED");
        } else if (current.equals("PAYMENT_COMPLETED")) {
            return newStatus.equals("COMPLETED") || newStatus.equals("FULFILLMENT_ERROR");
        } else if (current.equals("COMPLETED")) {
            return newStatus.equals("REFUNDED") || newStatus.equals("PARTIALLY_REFUNDED");
        } else if (current.equals("CANCELLED") || current.equals("REFUNDED")) {
            return false; // Terminal states
        }
        
        return false;
    }
    
    /**
     * Cancel order and rollback
     */
    public OrderResult cancelOrder(Order order) {
        if (order == null) {
            return OrderResult.failure("Order cannot be null");
        }
        
        String status = order.getStatus();
        
        if (status.equals("COMPLETED")) {
            return OrderResult.failure("Cannot cancel completed order - use refund instead");
        }
        
        if (status.equals("CANCELLED")) {
            return OrderResult.failure("Order is already cancelled");
        }
        
        // Rollback based on current status
        if (status.equals("INVENTORY_RESERVED") || status.equals("PAYMENT_FAILED")) {
            try {
                for (OrderItem item : order.getItems()) {
                    PreparedStatement stmt = dbConnection.prepareStatement(
                        "UPDATE inventory SET reserved_quantity = reserved_quantity - ? WHERE product_id = ?"
                    );
                    stmt.setInt(1, item.getQuantity());
                    stmt.setString(2, item.getProductId());
                    stmt.executeUpdate();
                    stmt.close();
                }
            } catch (SQLException e) {
                return OrderResult.failure("Failed to release inventory: " + e.getMessage());
            }
        }
        
        order.setStatus("CANCELLED");
        return OrderResult.success(order.getOrderId(), "Order cancelled successfully");
    }
    
    /**
     * Process refund for completed order
     */
    public OrderResult refundOrder(Order order, double refundAmount) {
        if (order == null) {
            return OrderResult.failure("Order cannot be null");
        }
        
        if (!order.getStatus().equals("COMPLETED")) {
            return OrderResult.failure("Can only refund completed orders");
        }
        
        if (refundAmount <= 0) {
            return OrderResult.failure("Refund amount must be positive");
        }
        
        if (refundAmount > order.getTotalAmount()) {
            return OrderResult.failure("Refund amount exceeds order total");
        }
        
        // Process refund through payment gateway
        String pm = order.getPaymentMethod().toUpperCase();
        String refundTransactionId = null;
        
        // DUPLICATED payment method handling
        if (pm.equals("CREDIT_CARD") || pm.equals("DEBIT_CARD")) {
            refundTransactionId = processRefundGateway(pm, refundAmount);
        } else if (pm.equals("PAYPAL")) {
            refundTransactionId = processRefundGateway("PAYPAL", refundAmount);
        } else if (pm.equals("BANK_TRANSFER")) {
            refundTransactionId = processRefundGateway("BANK_TRANSFER", refundAmount);
        } else if (pm.equals("CRYPTO")) {
            refundTransactionId = processRefundGateway("CRYPTO", refundAmount);
        }
        
        if (refundTransactionId == null) {
            return OrderResult.failure("Refund processing failed");
        }
        
        // Update order status
        if (refundAmount == order.getTotalAmount()) {
            order.setStatus("REFUNDED");
        } else {
            order.setStatus("PARTIALLY_REFUNDED");
        }
        
        // Restore inventory
        try {
            for (OrderItem item : order.getItems()) {
                PreparedStatement stmt = dbConnection.prepareStatement(
                    "UPDATE inventory SET quantity_available = quantity_available + ? WHERE product_id = ?"
                );
                stmt.setInt(1, item.getQuantity());
                stmt.setString(2, item.getProductId());
                stmt.executeUpdate();
                stmt.close();
            }
        } catch (SQLException e) {
            System.err.println("Failed to restore inventory: " + e.getMessage());
        }
        
        // Deduct loyalty points
        int pointsToDeduct = (int) (refundAmount * 10);
        try {
            PreparedStatement stmt = dbConnection.prepareStatement(
                "UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - ?) WHERE customer_id = ?"
            );
            stmt.setInt(1, pointsToDeduct);
            stmt.setString(2, order.getCustomerId());
            stmt.executeUpdate();
            stmt.close();
        } catch (SQLException e) {
            System.err.println("Failed to deduct loyalty points: " + e.getMessage());
        }
        
        OrderResult result = OrderResult.success(order.getOrderId(), "Refund processed successfully");
        result.setTransactionId(refundTransactionId);
        result.setFinalAmount(refundAmount);
        return result;
    }
    
    private String processRefundGateway(String paymentType, double amount) {
        // Simulate refund processing
        return "REFUND_" + System.currentTimeMillis();
    }
    
    /**
     * Get order summary - another place with discount calculation duplication
     */
    public Map<String, Object> getOrderSummary(Order order) {
        Map<String, Object> summary = new HashMap<>();
        
        if (order == null) {
            return summary;
        }
        
        double subtotal = 0;
        int itemCount = 0;
        for (OrderItem item : order.getItems()) {
            subtotal += item.getQuantity() * item.getUnitPrice();
            itemCount += item.getQuantity();
        }
        
        // DUPLICATED discount calculation
        double discount = 0;
        if (itemCount >= 10 && itemCount < 25) {
            discount = subtotal * 0.05;
        } else if (itemCount >= 25 && itemCount < 50) {
            discount = subtotal * 0.10;
        } else if (itemCount >= 50 && itemCount < 100) {
            discount = subtotal * 0.15;
        } else if (itemCount >= 100) {
            discount = subtotal * 0.20;
        }
        
        summary.put("subtotal", subtotal);
        summary.put("itemCount", itemCount);
        summary.put("quantityDiscount", discount);
        summary.put("status", order.getStatus());
        
        return summary;
    }
}
