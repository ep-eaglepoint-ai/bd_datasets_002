package com.ecommerce.order;

import com.ecommerce.order.repository.*;
import com.ecommerce.order.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

// Minimal mock implementations for pure unit testing without Mockito dependency (Standard Lib constraint)
class MockOrderRepository implements OrderRepository {
    @Override public void save(Order order) {}
    @Override public Order findById(String id) { return null; }
    @Override public void updateStatus(String id, String status) {}
}

class MockCustomerRepository implements CustomerRepository {
    @Override public boolean isValid(String id) { return true; }
    @Override public boolean isActive(String id) { return true; }
    @Override public boolean isBlocked(String id) { return false; }
    @Override public String getCustomerTier(String id) { return "REGULAR"; }
}

class MockInventoryService implements InventoryService {
    @Override public boolean checkInventory(String id, int qty) { return true; }
    @Override public void reserve(String id, int qty) {}
    @Override public void release(String id, int qty) {}
    @Override public void commit(String id, int qty) {}
}

class MockPaymentGateway implements PaymentGateway {
    @Override public String charge(double amount, String token, String currency) { return "TXN_TEST"; }
    @Override public String refund(String id, double amount) { return "REF_TEST"; }
    @Override public boolean supports(String pm) { return true; }
}

class MockCouponRepository implements CouponRepository {
    @Override public Optional<CouponDetails> findByCode(String code) { return Optional.empty(); }
    @Override public void incrementUsage(String code) {}
}

public class OrderProcessorTest {

    private OrderProcessor processor;
    private Order order;

    @BeforeEach
    void setUp() {
        processor = new OrderProcessor(
            new MockOrderRepository(),
            new MockCustomerRepository(),
            new MockInventoryService(),
            new MockPaymentGateway(),
            new MockCouponRepository()
        );
        
        order = new Order();
        order.setOrderId("ORD-1");
        order.setCustomerId("CUST-1");
        order.setStatus("PENDING");
        order.setPaymentMethod("CREDIT_CARD");
        
        OrderItem item = new OrderItem("PROD-1", "Widget", 1, 100.0);
        order.addItem(item);
    }

    @Test
    void testProcessOrderSuccess() {
        OrderResult result = processor.processOrder(order);
        assertTrue(result.isSuccess(), "Order should be successful");
        assertEquals("COMPLETED", order.getStatus());
        assertEquals("TXN_TEST", result.getTransactionId());
    }

    @Test
    void testProcessOrderValidationFailure() {
        order.setCustomerId(null); // Invalid
        OrderResult result = processor.processOrder(order);
        assertFalse(result.isSuccess());
        assertTrue(result.getMessage().contains("Customer ID is required"));
    }

    @Test
    void testPricingCalculation() {
        // 1 item @ 100.0. No discount. Shipping < 100? Valid check.
        // Item is 100.0. Shipping logic: >= 100 is free (if physical).
        // Let's assume physical.
        // Tax 8% = 8.0.
        // Total = 100 + 8 = 108.0
        
        OrderResult result = processor.processOrder(order);
        assertEquals(108.0, result.getFinalAmount(), 0.01);
    }
}
