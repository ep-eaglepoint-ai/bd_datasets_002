package com.ecommerce.order;

import java.util.ArrayList;
import java.util.List;

public class OrderResult {
    private boolean success;
    private String orderId;
    private String status;
    private String message;
    private List<String> errors;
    private double finalAmount;
    private String transactionId;
    private String trackingNumber;

    public OrderResult() {
        this.errors = new ArrayList<>();
    }

    public static OrderResult success(String orderId, String message) {
        OrderResult result = new OrderResult();
        result.success = true;
        result.orderId = orderId;
        result.message = message;
        result.status = "COMPLETED";
        return result;
    }

    public static OrderResult failure(String message) {
        OrderResult result = new OrderResult();
        result.success = false;
        result.message = message;
        result.status = "FAILED";
        return result;
    }

    public static OrderResult failure(String message, List<String> errors) {
        OrderResult result = failure(message);
        result.errors = errors;
        return result;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }
    public void addError(String error) { this.errors.add(error); }

    public double getFinalAmount() { return finalAmount; }
    public void setFinalAmount(double finalAmount) { this.finalAmount = finalAmount; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
}

