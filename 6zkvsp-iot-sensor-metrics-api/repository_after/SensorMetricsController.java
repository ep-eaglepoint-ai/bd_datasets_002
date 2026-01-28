package com.example.sensormetrics;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sensors")
public class SensorMetricsController {

    @PostMapping("/metrics")
    public SensorMetricsResponse metrics(
            @RequestBody(required = false) List<SensorMetricsRequestReading> readings
    ) {
        int cacheSize = readings == null ? 0 : readings.size();
        if (readings == null || readings.isEmpty()) {
            return new SensorMetricsResponse(Collections.emptyMap(), cacheSize);
        }

        Map<String, Accumulator> acc = new HashMap<>();
        for (SensorMetricsRequestReading r : readings) {
            if (!isValidReading(r)) {
                continue;
            }

            String sensorId = r.sensorId().trim();
            double value = r.value();
            long timestamp = r.timestamp();

            Accumulator a = acc.computeIfAbsent(sensorId, i -> new Accumulator());
            a.count += 1;
            a.sum += value;
            a.maybeUpdateMax(sensorId, value, timestamp);
        }

        if (acc.isEmpty()) {
            return new SensorMetricsResponse(Collections.emptyMap(), cacheSize);
        }

        Map<String, SensorMetricsResponse.PerSensorMetrics> perSensor = new HashMap<>(acc.size());
        for (Map.Entry<String, Accumulator> e : acc.entrySet()) {
            Accumulator a = e.getValue();
            perSensor.put(
                    e.getKey(),
                    new SensorMetricsResponse.PerSensorMetrics(
                            a.count,
                            a.sum / a.count,
                            a.max
                    )
            );
        }

        return new SensorMetricsResponse(perSensor, cacheSize);
    }

    private static boolean isValidReading(SensorMetricsRequestReading r) {
        if (r == null) {
            return false;
        }
        String sensorId = r.sensorId();
        if (sensorId == null || sensorId.trim().isEmpty()) {
            return false;
        }
        Double value = r.value();
        Long timestamp = r.timestamp();
        if (value == null || timestamp == null) {
            return false;
        }
        return Double.isFinite(value);
    }

    private static final class Accumulator {
        int count;
        double sum;
        SensorMetricsResponse.MaxReading max;
        double maxValue;
        long maxTimestamp;

        void maybeUpdateMax(String sensorId, double value, long timestamp) {
            boolean isFirst = (max == null);
            boolean isNewMax = value > maxValue;
            boolean isNewerSameMax = (value == maxValue) && (timestamp > maxTimestamp);

            if (isFirst || isNewMax || isNewerSameMax) {
                maxValue = value;
                maxTimestamp = timestamp;
                max = new SensorMetricsResponse.MaxReading(sensorId, value, timestamp);
            }
        }
    }
}
