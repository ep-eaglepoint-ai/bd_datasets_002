package com.eaglepoint.iot;

public record SensorMetricsRequestReading(
    String sensorId,
    Double value,
    Long timestamp
) {}
