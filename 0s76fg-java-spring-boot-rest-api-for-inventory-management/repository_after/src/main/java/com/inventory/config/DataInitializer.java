package com.inventory.config;

import com.inventory.model.*;
import com.inventory.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.Arrays;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner loadData(ProductRepository productRepository, 
                                      LocationRepository locationRepository, 
                                      InventoryRepository inventoryRepository,
                                      StockMovementRepository stockMovementRepository) {
        return args -> {
            if (productRepository.count() > 0) return;

            // 1. Create Products
            Product p1 = createProduct("PROD-000001", "Laptop X1", "High performance laptop", "Electronics", new BigDecimal("1200.00"));
            Product p2 = createProduct("PROD-000002", "Mouse Wireless", "Ergonomic mouse", "Electronics", new BigDecimal("25.00"));
            Product p3 = createProduct("PROD-000003", "Keyboard Mech", "Mechanical keyboard", "Electronics", new BigDecimal("80.00"));
            Product p4 = createProduct("PROD-000004", "Monitor 27", "4K Monitor", "Electronics", new BigDecimal("350.00"));
            Product p5 = createProduct("PROD-000005", "Desk Chair", "Office chair", "Furniture", new BigDecimal("150.00"));
            Product p6 = createProduct("PROD-000006", "Office Desk", "Wooden desk", "Furniture", new BigDecimal("200.00"));
            Product p7 = createProduct("PROD-000007", "Notebook A4", "Running notebook", "Stationery", new BigDecimal("5.00"));
            Product p8 = createProduct("PROD-000008", "Pen Set", "Blue and Black pens", "Stationery", new BigDecimal("3.00"));
            Product p9 = createProduct("PROD-000009", "Stapler", "Heavy duty stapler", "Stationery", new BigDecimal("10.00"));
            Product p10 = createProduct("PROD-000010", "USB Hub", "USB C Hub", "Electronics", new BigDecimal("45.00"));

            productRepository.saveAll(Arrays.asList(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10));

            // 2. Create Locations
            Location l1 = createLocation("WH-001", "Central Warehouse", Location.Type.WAREHOUSE, 10000);
            Location l2 = createLocation("WH-002", "East Coast Warehouse", Location.Type.WAREHOUSE, 5000);
            Location l3 = createLocation("WH-003", "West Coast Warehouse", Location.Type.WAREHOUSE, 5000);
            Location l4 = createLocation("STR-001", "Downtown Store", Location.Type.STORE, 1000);
            Location l5 = createLocation("STR-002", "Mall Store", Location.Type.STORE, 800);

            locationRepository.saveAll(Arrays.asList(l1, l2, l3, l4, l5));

            // 3. Create Initial Inventory (Directly to simulate existing state, but we should probably use service logic to get audit? 
            // For initialization, direct save is fine, or we can create movements. Let's do direct for simplicity of 'setup' 
            // but creating initial movements is 'cleaner' for audit. Let's do direct save + INITIAL_LOAD movement)

            createStock(inventoryRepository, stockMovementRepository, p1, l1, 100, 10);
            createStock(inventoryRepository, stockMovementRepository, p2, l1, 500, 50);
            createStock(inventoryRepository, stockMovementRepository, p3, l1, 200, 20);
            
            createStock(inventoryRepository, stockMovementRepository, p1, l2, 50, 5);
            createStock(inventoryRepository, stockMovementRepository, p4, l2, 100, 10);
            
            createStock(inventoryRepository, stockMovementRepository, p5, l3, 50, 10);
            createStock(inventoryRepository, stockMovementRepository, p6, l3, 30, 5);
            
            createStock(inventoryRepository, stockMovementRepository, p2, l4, 20, 5); // Store stock
            createStock(inventoryRepository, stockMovementRepository, p2, l5, 15, 5); // Store stock
        };
    }

    private Product createProduct(String sku, String name, String desc, String cat, BigDecimal price) {
        Product p = new Product();
        p.setSku(sku);
        p.setName(name);
        p.setDescription(desc);
        p.setCategory(cat);
        p.setUnitPrice(price);
        return p;
    }

    private Location createLocation(String code, String name, Location.Type type, int capacity) {
        Location l = new Location();
        l.setCode(code);
        l.setName(name);
        l.setType(type);
        l.setCapacity(capacity);
        
        Address a = new Address();
        a.setStreet("123 Main St");
        a.setCity("City");
        a.setState("State");
        a.setZip("12345");
        a.setCountry("Country");
        l.setAddress(a);
        
        return l;
    }

    private void createStock(InventoryRepository inventoryRepo, StockMovementRepository movementRepo, 
                           Product p, Location l, int qty, int reorder) {
        Inventory i = new Inventory();
        i.setProduct(p);
        i.setLocation(l);
        i.setQuantity(qty);
        i.setReservedQuantity(0);
        i.setReorderPoint(reorder);
        inventoryRepo.save(i);

        StockMovement sm = new StockMovement();
        sm.setProduct(p);
        sm.setToLocation(l);
        sm.setQuantity(qty);
        sm.setType(StockMovement.Type.ADJUSTMENT); // Initial Load
        sm.setReference("INIT-LOAD");
        sm.setNotes("Initial data load");
        sm.setPerformedBy("SYSTEM");
        movementRepo.save(sm);
    }
}
