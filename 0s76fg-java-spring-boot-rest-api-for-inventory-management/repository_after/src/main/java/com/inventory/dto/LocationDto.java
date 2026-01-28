package com.inventory.dto;

import com.inventory.model.Address;
import com.inventory.model.Location;

public class LocationDto {
    private Long id;
    private String code;
    private String name;
    private Location.Type type;
    private Address address;
    private int capacity;
    private boolean active;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Location.Type getType() { return type; }
    public void setType(Location.Type type) { this.type = type; }
    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }
    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
