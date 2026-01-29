package com.eaglepoint.iot;

public record SensorMetricsRequest(
    String sensorId,
    Double value,
    Long timestamp
) {}
