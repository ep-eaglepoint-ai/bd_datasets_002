package com.example.inventory;

import java.util.Objects;

public class Item {
    private String sku;
    private int quantity;

    public Item() {
    }

    public Item(String sku, int quantity) {
        this.sku = sku;
        this.quantity = quantity;
    }

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Item item = (Item) o;
        return quantity == item.quantity && Objects.equals(sku, item.sku);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sku, quantity);
    }
}
