package com.example.sensormetrics;

public record SensorMetricsRequestReading(
    String sensorId,
    Double value,
    Long timestamp
) {}
