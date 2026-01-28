package com.eaglepoint.iot;

import java.util.Map;

public record SensorMetricsResponse(
    Map<String, PerSensorMetrics> perSensor,
    int cacheSize
) {
    public static record PerSensorMetrics(
        int count,
        double averageValue,
        MaxReading maxReading
    ) {}

    public static record MaxReading(
        String sensorId,
        double value,
        long timestamp
    ) {}
}
