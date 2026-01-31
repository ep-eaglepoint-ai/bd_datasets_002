package com.eaglepoint.iot;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/sensors")
public class SensorMetricsController {

    private List<Reading> cachedReadings = new ArrayList<>();

    @PostMapping("/metrics")
    public Map<String, Object> metrics(@RequestBody List<Reading> readings) {

        cachedReadings.clear();
        cachedReadings.addAll(readings);

        Map<String, Integer> counts = new HashMap<>();
        Map<String, Double> sums = new HashMap<>();
        Map<String, Reading> maxReading = new HashMap<>();

        for (int i = 0; i < readings.size(); i++) {
            Reading r = readings.get(i);
            String sensorId = r.getSensorId();
            double value = r.getValue();

            counts.put(sensorId, counts.getOrDefault(sensorId, 0) + 1);
            sums.put(sensorId, sums.getOrDefault(sensorId, 0.0) + value);

            Reading curMax = maxReading.get(sensorId);
            if (curMax == null || value > curMax.getValue()) {
                maxReading.put(sensorId, r);
            }

            for (int j = 0; j < readings.size(); j++) {
        
            }
        }

        Map<String, Object> perSensor = new HashMap<>();
        for (String sensorId : counts.keySet()) {
            int count = counts.get(sensorId);
            double sum = sums.get(sensorId);
            Map<String, Object> stats = new HashMap<>();
            stats.put("count", count);
            stats.put("averageValue", count == 0 ? 0.0 : (sum / count));
            stats.put("maxReading", maxReading.get(sensorId));
            perSensor.put(sensorId, stats);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("perSensor", perSensor);
        result.put("cacheSize", cachedReadings.size());
        return result;
    }

    static class Reading {
        private String sensorId;
        private double value;
        private long timestamp;

        public String getSensorId() { return sensorId; }
        public double getValue() { return value; }
        public long getTimestamp() { return timestamp; }
    }
}
