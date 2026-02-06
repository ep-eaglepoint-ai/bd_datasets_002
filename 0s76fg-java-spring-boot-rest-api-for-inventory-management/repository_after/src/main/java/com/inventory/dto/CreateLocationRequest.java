package com.inventory.dto;

import com.inventory.model.Address;
import com.inventory.model.Location;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public class CreateLocationRequest {
    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Type is required")
    private Location.Type type;

    @NotNull(message = "Address is required")
    @Valid
    private Address address;

    @Min(value = 1, message = "Capacity must be positive")
    private int capacity;

    // Getters and Setters
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
}
