package com.example.sessions;

import javax.validation.constraints.*;

public class Session {
    @NotNull
    private Long startTime;

    @NotNull
    private Long endTime;

    public Session() {}

    public Session(Long startTime, Long endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public Long getStartTime() { return startTime; }
    public void setStartTime(Long startTime) { this.startTime = startTime; }

    public Long getEndTime() { return endTime; }
    public void setEndTime(Long endTime) { this.endTime = endTime; }

    @AssertTrue(message = "endTime must be greater than or equal to startTime")
    public boolean isEndAfterOrEqualStart() {
        // Deterministic: if either value is missing, validation fails
        if (startTime == null || endTime == null) return false;
        return endTime >= startTime;
    }
}
