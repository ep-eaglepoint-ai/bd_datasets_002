package com.ecommerce.order.service;

import com.ecommerce.order.OrderItem;
import java.util.List;

public interface InventoryService {
    boolean checkInventory(String productId, int quantity);
    void reserve(String productId, int quantity);
    void release(String productId, int quantity);
    void commit(String productId, int quantity);
}
