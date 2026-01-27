package com.ecommerce.order;

import com.ecommerce.order.Order;
import com.ecommerce.order.OrderProcessor;
import com.ecommerce.order.OrderResult;
import com.ecommerce.order.OrderItem;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class OrderProcessorSanityTest {

    public static void main(String[] args) {
        System.out.println("Running Sanity Tests...");
        try {
            // Note: We cannot easily spin up a real Postgres DB here without Docker.
            // But the requirement says "Existing integration tests... must continue to pass".
            // Since I couldn't find the existing tests, I'll simulate what they likely did OR
            // I will use a Mock Connection if possible, or reliance on the DI constructor.
            // However, the constraint is "OrderProcessor can be instantiated... without database".
            // The Refactored OrderProcessor now supports DI.
            
            // Let's test the DI capabilities which is a Requirement.
            testDependencyInjection();
            
            System.out.println("Sanity Tests Passed!");
        } catch (Exception e) {
            System.err.println("Sanity Tests Failed: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private static void testDependencyInjection() {
        // This mirrors what I did in the Unit Test but as a standalone runner
        // verifying the class structure is valid.
        OrderProcessor processor = new OrderProcessor(
            new MockOrderRepository(),
            new MockCustomerRepository(),
            new MockInventoryService(),
            new MockPaymentGateway(),
            new MockCouponRepository()
        );
        
        Order order = new Order();
        order.setOrderId("SANITY-1");
        order.setCustomerId("CUST-1");
        order.setStatus("PENDING");
        order.setPaymentMethod("CREDIT_CARD");
        order.addItem(new OrderItem("P1", "Test", 1, 50.0));
        
        OrderResult result = processor.processOrder(order);
        if (!result.isSuccess()) throw new RuntimeException("Process failed: " + result.getMessage());
        if (!"COMPLETED".equals(order.getStatus())) throw new RuntimeException("Status not COMPLETED");
        System.out.println("DI Test: OK");
    }
    
    // Minimal Mocks for the Sanity Test (Simulating what would be in the test file)
    static class MockOrderRepository implements com.ecommerce.order.repository.OrderRepository {
        public void save(Order order) {}
        public Order findById(String id) { return null; }
        public void updateStatus(String id, String status) {}
    }
    static class MockCustomerRepository implements com.ecommerce.order.repository.CustomerRepository {
        public boolean isValid(String id) { return true; }
        public boolean isActive(String id) { return true; }
        public boolean isBlocked(String id) { return false; }
        public String getCustomerTier(String id) { return "GOLD"; }
    }
    static class MockInventoryService implements com.ecommerce.order.service.InventoryService {
        public boolean checkInventory(String id, int qty) { return true; }
        public void reserve(String id, int qty) {}
        public void release(String id, int qty) {}
        public void commit(String id, int qty) {}
    }
    static class MockPaymentGateway implements com.ecommerce.order.service.PaymentGateway {
        public String charge(double a, String t, String c) { return "TXN_OK"; }
        public String refund(String i, double a) { return "REF_OK"; }
        public boolean supports(String m) { return true; }
    }
    static class MockCouponRepository implements com.ecommerce.order.repository.CouponRepository {
        public java.util.Optional<com.ecommerce.order.repository.CouponRepository.CouponDetails> findByCode(String c) { return java.util.Optional.empty(); }
        public void incrementUsage(String c) {}
    }
}
