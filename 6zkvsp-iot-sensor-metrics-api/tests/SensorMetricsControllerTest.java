package com.eaglepoint.iot;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SensorMetricsController.class)
public class SensorMetricsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    public void testMetricsValidAndDeterministicMaxTieBreak() throws Exception {
        String json = "[" +
                "{\"sensorId\":\"s1\",\"value\":1.0,\"timestamp\":10}," +
                "{\"sensorId\":\"s1\",\"value\":2.0,\"timestamp\":20}," +
                "{\"sensorId\":\"s1\",\"value\":2.0,\"timestamp\":15}," +
                "{\"sensorId\":\"s2\",\"value\":5.0,\"timestamp\":99}," +
                "{\"sensorId\":\"s2\",\"value\":3.0,\"timestamp\":100}" +
                "]";

        try {
            mockMvc.perform(post("/api/sensors/metrics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cacheSize").value(5))
                    .andExpect(jsonPath("$.perSensor.s1.count").value(3))
                    .andExpect(jsonPath("$.perSensor.s1.averageValue").value((1.0 + 2.0 + 2.0) / 3.0))
                    .andExpect(jsonPath("$.perSensor.s1.maxReading.sensorId").value("s1"))
                    .andExpect(jsonPath("$.perSensor.s1.maxReading.value").value(2.0))
                    .andExpect(jsonPath("$.perSensor.s1.maxReading.timestamp").value(20))
                    .andExpect(jsonPath("$.perSensor.s2.count").value(2))
                    .andExpect(jsonPath("$.perSensor.s2.averageValue").value((5.0 + 3.0) / 2.0))
                    .andExpect(jsonPath("$.perSensor.s2.maxReading.sensorId").value("s2"))
                    .andExpect(jsonPath("$.perSensor.s2.maxReading.value").value(5.0))
                    .andExpect(jsonPath("$.perSensor.s2.maxReading.timestamp").value(99));
        } catch (Exception e) {
            fail("Request processing threw an exception; treating as test failure instead of error.", e);
        }
    }

    @Test
    public void testEmptyInput() throws Exception {
        String json = "[]";

        try {
            mockMvc.perform(post("/api/sensors/metrics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cacheSize").value(0))
                    .andExpect(jsonPath("$.perSensor").isEmpty());
        } catch (Exception e) {
            fail("Request processing threw an exception; treating as test failure instead of error.", e);
        }
    }

    @Test
    public void testPartiallyInvalidInputDoesNotCorruptAnalytics() throws Exception {
        String json = "[" +
                "null," +
                "{\"sensorId\":null,\"value\":1.0,\"timestamp\":1}," +
                "{\"sensorId\":\"\",\"value\":1.0,\"timestamp\":1}," +
                "{\"sensorId\":\"   \",\"value\":1.0,\"timestamp\":1}," +
                "{\"sensorId\":\"s1\",\"value\":null,\"timestamp\":1}," +
                "{\"sensorId\":\"s1\",\"value\":4.0,\"timestamp\":2}," +
                "{\"sensorId\":\"s1\",\"value\":6.0,\"timestamp\":3}" +
                "]";

        try {
            mockMvc.perform(post("/api/sensors/metrics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cacheSize").value(7))
                    .andExpect(jsonPath("$.perSensor.s1.count").value(2))
                    .andExpect(jsonPath("$.perSensor.s1.averageValue").value((4.0 + 6.0) / 2.0))
                    .andExpect(jsonPath("$.perSensor.s1.maxReading.value").value(6.0))
                    .andExpect(jsonPath("$.perSensor").value(org.hamcrest.Matchers.aMapWithSize(1)));
        } catch (Exception e) {
            fail("Request processing threw an exception; treating as test failure instead of error.", e);
        }
    }

    @Test
    public void testRequestIsolationNoCrossRequestState() throws Exception {
        String json1 = "[" +
                "{\"sensorId\":\"a\",\"value\":1.0,\"timestamp\":1}" +
                "]";
        String json2 = "[" +
                "{\"sensorId\":\"b\",\"value\":2.0,\"timestamp\":2}," +
                "{\"sensorId\":\"b\",\"value\":3.0,\"timestamp\":3}" +
                "]";

        try {
            mockMvc.perform(post("/api/sensors/metrics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json1))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cacheSize").value(1))
                    .andExpect(jsonPath("$.perSensor.a.count").value(1));

            mockMvc.perform(post("/api/sensors/metrics")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json2))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cacheSize").value(2))
                    .andExpect(jsonPath("$.perSensor.b.count").value(2))
                    .andExpect(jsonPath("$.perSensor.a").doesNotExist());
        } catch (Exception e) {
            fail("Request processing threw an exception; treating as test failure instead of error.", e);
        }
    }
}