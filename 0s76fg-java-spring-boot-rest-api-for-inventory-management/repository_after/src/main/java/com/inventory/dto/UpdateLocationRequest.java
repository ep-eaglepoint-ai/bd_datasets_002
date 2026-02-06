package com.inventory.dto;

import com.inventory.model.Address;
import com.inventory.model.Location;

public class UpdateLocationRequest {
    private String name;
    private Location.Type type;
    private Address address;
    private Integer capacity;
    private Boolean active;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Location.Type getType() { return type; }
    public void setType(Location.Type type) { this.type = type; }
    public Address getAddress() { return address; }
    public void setAddress(Address address) { this.address = address; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
