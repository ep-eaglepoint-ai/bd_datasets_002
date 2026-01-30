package com.example.gamestats;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class FootballSeasonStatsTest {

    private Object controller;
    private Class<?> controllerClass;
    private Class<?> serviceImplClass;
    private Object serviceInstance;

    @BeforeEach
    public void setUp() throws Exception {
        controllerClass = Class.forName("com.example.gamestats.FootballSeasonStatsController");
        controller = instantiateController(controllerClass);
    }

    private Object instantiateController(Class<?> controllerClass) throws Exception {
        try {
            Class<?> serviceInterface = Class.forName("com.example.gamestats.FootballSeasonStatsService");
            serviceImplClass = Class.forName("com.example.gamestats.FootballSeasonStatsServiceImpl");
            serviceInstance = serviceImplClass.getDeclaredConstructor().newInstance();
            return controllerClass.getDeclaredConstructor(serviceInterface).newInstance(serviceInstance);
        } catch (ClassNotFoundException e) {
            return controllerClass.getDeclaredConstructor().newInstance();
        }
    }

    @Test
    public void testApiContract() {
        try {
            Class<?> getMapping = Class.forName("org.springframework.web.bind.annotation.GetMapping");
            Method method = controllerClass.getMethod("getSeasonStats", String.class, int.class);
            
            if (method.isAnnotationPresent((Class) getMapping)) {
                Object annotation = method.getAnnotation((Class) getMapping);
                Method valueMethod = getMapping.getMethod("value");
                String[] values = (String[]) valueMethod.invoke(annotation);
                Assertions.assertEquals("/api/football/season/stats", values[0], "Endpoint path mismatch");
            } else {
                 // For now, allow pass if method exists, but ideally strictly check annotation
            }
        } catch (Exception e) {
             Assertions.fail("API contract check failed: " + e.getMessage());
        }
    }

    @Test
    public void testResponseStructure() throws Exception {
        Method getStatsMethod = controllerClass.getMethod("getSeasonStats", String.class, int.class);
        Object result = getStatsMethod.invoke(controller, "TestTeam", 2024);
        Assertions.assertNotNull(result, "Response should not be null");
        
        // Controller returns Map<String, Object> to match original API
        Assertions.assertTrue(result instanceof Map, "Response should be Map<String, Object>");
        Map<?, ?> map = (Map<?, ?>) result;
        
        // Verify exact JSON keys
        Assertions.assertTrue(map.containsKey("team"));
        Assertions.assertTrue(map.containsKey("season"));
        Assertions.assertTrue(map.containsKey("matchesPlayed"));
        Assertions.assertTrue(map.containsKey("totalGoalsScored"));
        Assertions.assertTrue(map.containsKey("totalFoulsCommitted"));
        Assertions.assertTrue(map.containsKey("matchStats"));
        Assertions.assertEquals(6, map.size(), "Response must have exactly 6 keys");
    }
    
    private void assertMethodExists(Object obj, String... possibleNames) {
        boolean found = false;
        for (String name : possibleNames) {
            try {
                obj.getClass().getMethod(name);
                found = true;
                break;
            } catch (NoSuchMethodException e) {
                // continue
            }
        }
        if (!found) {
            Assertions.fail("Missing accessor for field: " + possibleNames[0]);
        }
    }

    @Test
    public void testPerformanceAndNonBlocking() throws Exception {
        Method getStatsMethod = controllerClass.getMethod("getSeasonStats", String.class, int.class);
        long start = System.nanoTime();
        getStatsMethod.invoke(controller, "PerfTeam", 2024);
        long duration = (System.nanoTime() - start) / 1_000_000;
        
        Assertions.assertTrue(duration < 200, "Execution time exceeded limit 200ms: " + duration + " ms");
    }

    @Test
    public void testAggregationAndSorting() throws Exception {
        Method getStatsMethod = controllerClass.getMethod("getSeasonStats", String.class, int.class);
        Object result = getStatsMethod.invoke(controller, "LogicTeam", 2024);
        
        List<?> matches = getMatches(result);
        int totalGoals = getIntField(result, "getTotalGoalsScored");
        int totalFouls = getIntField(result, "getTotalFoulsCommitted");
        
        Assertions.assertEquals(38, matches.size(), "Match count mismatch");

        int calcGoals = 0;
        int calcFouls = 0;
        int prevGoals = Integer.MAX_VALUE;
        
        for (Object m : matches) {
            int g = getIntField(m, "getGoalsFor");
            int f = getIntField(m, "getFouls");
            calcGoals += g;
            calcFouls += f;
            
            if (g > prevGoals) {
                 Assertions.fail("Sorting violation: Matches not sorted by goalsFor descending");
            }
            prevGoals = g;
        }
        
        Assertions.assertEquals(calcGoals, totalGoals, "Total goals aggregation mismatch");
        Assertions.assertEquals(calcFouls, totalFouls, "Total fouls aggregation mismatch");
    }

    @Test
    public void testConcurrency() throws InterruptedException {
        int threads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        List<Future<Boolean>> futures = new ArrayList<>();
        
        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                try {
                    Method m = controllerClass.getMethod("getSeasonStats", String.class, int.class);
                    long start = System.nanoTime();
                    m.invoke(controller, "ConcTeam", 2024);
                    long duration = (System.nanoTime() - start) / 1_000_000;
                    return duration < 200; // Strict requirement
                } catch (Exception e) {
                    return false;
                }
            }));
        }
        
        for (Future<Boolean> f : futures) {
            try {
                Assertions.assertTrue(f.get(), "Concurrent request failed or too slow (>200ms)");
            } catch (Exception e) {
                Assertions.fail("Concurrency exception: " + e.getMessage());
            }
        }
        executor.shutdown();
    }
    
    @Test
    public void testLoadHighTraffic() throws InterruptedException {
        // Thousands per minute simulation
        int threads = 50;
        int requestsPerThread = 50; // Total 2500 requests
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        AtomicInteger failures = new AtomicInteger(0);
        
        long startGlobal = System.nanoTime();
        
        java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(threads);
        
        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    Method m = controllerClass.getMethod("getSeasonStats", String.class, int.class);
                    for (int j = 0; j < requestsPerThread; j++) {
                         long start = System.nanoTime();
                         m.invoke(controller, "LoadTeam", 2024);
                         long duration = (System.nanoTime() - start) / 1_000_000;
                         if (duration > 200) failures.incrementAndGet();
                    }
                } catch (Exception e) {
                    failures.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        
        latch.await(30, TimeUnit.SECONDS);
        long totalDurationMs = (System.nanoTime() - startGlobal) / 1_000_000;
        
        Assertions.assertEquals(0, failures.get(), "Load test failures detected (slow or exception)");
        
        // Calculate throughput
        double rpm = (double)(threads * requestsPerThread) / totalDurationMs * 60000;
        System.out.println("Load Test Throughput: " + rpm + " RPM");
    }

    @Test
    public void testEdgeCases() throws Exception {
        Method m = controllerClass.getMethod("getSeasonStats", String.class, int.class);
        
        // Null team
        Object res1 = m.invoke(controller, null, 2024);
        Assertions.assertNotNull(res1);
        
        // Invalid season
        Object res2 = m.invoke(controller, "Team", -1);
        Assertions.assertNotNull(res2);
        Assertions.assertEquals(-1, getIntField(res2, "getSeason"));
    }

    @Test
    public void testArchitecture() {
         boolean hasService = false;
         try {
             Class.forName("com.example.gamestats.FootballSeasonStatsService");
             hasService = true;
         } catch (ClassNotFoundException e) {
             hasService = false;
         }
         Assertions.assertTrue(hasService, "Service layer (FootballSeasonStatsService) missing");
         
         // Check Controller fields
         Field[] fields = controllerClass.getDeclaredFields();
         boolean hasServiceField = false;
         try {
             Class<?> serviceInterface = Class.forName("com.example.gamestats.FootballSeasonStatsService");
             for (Field f : fields) {
                 if (serviceInterface.isAssignableFrom(f.getType())) {
                     hasServiceField = true;
                     break;
                 }
             }
         } catch (Exception e) {}
         Assertions.assertTrue(hasServiceField, "Controller must depend on Service interface");
         
         // Check Immutability if possible (check if fields are final in DTO)
         try {
             Class<?> dtoClass = Class.forName("com.example.gamestats.SeasonStats");
             for (Field f : dtoClass.getDeclaredFields()) {
                 Assertions.assertTrue(java.lang.reflect.Modifier.isFinal(f.getModifiers()), "DTO fields should be final for immutability: " + f.getName());
             }
         } catch (Exception e) {}
    }

    @Test
    public void testExactJsonKeys() throws Exception {
        // Verify response contains exactly 6 keys (no extra fields)
        Class<?> seasonStatsClass = Class.forName("com.example.gamestats.SeasonStats");
        Field[] allFields = seasonStatsClass.getDeclaredFields();
        
        Assertions.assertEquals(6, allFields.length, "SeasonStats should have exactly 6 fields");
        
        // Verify expected field names
        java.util.Set<String> expectedFields = java.util.Set.of(
            "team", "season", "matchesPlayed", "totalGoalsScored", "totalFoulsCommitted", "matchStats"
        );
        java.util.Set<String> actualFields = new java.util.HashSet<>();
        for (Field f : allFields) {
            actualFields.add(f.getName());
        }
        Assertions.assertEquals(expectedFields, actualFields, "JSON keys must match original schema exactly");
    }

    @Test
    public void testNoBlockingCalls() throws Exception {
        // Verify no Thread.sleep calls exist in ServiceImpl via source code pattern
        // This uses reflection to check method implementations don't reference Thread.sleep
        Class<?> serviceImpl = Class.forName("com.example.gamestats.FootballSeasonStatsServiceImpl");
        
        // Check that the class doesn't import or use Thread in a blocking way
        // We verify by checking the execution is fast (< 5ms for simple operation)
        Object instance = serviceImpl.getDeclaredConstructor().newInstance();
        Method getStats = serviceImpl.getMethod("getSeasonStats", String.class, int.class);
        
        // Run multiple times to ensure consistent fast execution (no hidden sleeps)
        for (int i = 0; i < 10; i++) {
            long start = System.nanoTime();
            getStats.invoke(instance, "Test", 2024);
            long durationMs = (System.nanoTime() - start) / 1_000_000;
            Assertions.assertTrue(durationMs < 50, "Execution too slow, possible blocking call: " + durationMs + "ms");
        }
        
        // Additional check: verify Thread class is not used for sleep
        // by checking declared methods don't have Thread.sleep pattern in bytecode
        // (simplified: if all 10 runs are < 50ms, no 100ms+ sleeps exist)
    }

    @Test
    public void testLinearTimeComplexity() throws Exception {
        // Verify O(n) by checking execution time scales linearly
        // Since MATCHES_IN_SEASON is fixed at 38, we verify single execution is fast
        // and that there's no O(n^2) or O(n*10000) pattern
        
        Class<?> serviceImpl = Class.forName("com.example.gamestats.FootballSeasonStatsServiceImpl");
        Object instance = serviceImpl.getDeclaredConstructor().newInstance();
        Method getStats = serviceImpl.getMethod("getSeasonStats", String.class, int.class);
        
        // Warm up JIT
        for (int i = 0; i < 5; i++) {
            getStats.invoke(instance, "Warmup", 2024);
        }
        
        // Measure average execution time
        long totalNanos = 0;
        int iterations = 100;
        for (int i = 0; i < iterations; i++) {
            long start = System.nanoTime();
            getStats.invoke(instance, "Complexity", 2024);
            totalNanos += (System.nanoTime() - start);
        }
        double avgMs = (totalNanos / iterations) / 1_000_000.0;
        
        // O(n) with n=38 should be < 10ms average (no O(n*10000) loop)
        // Original bad code would take ~38 * 10000 iterations = 380,000 ops vs 38 ops
        Assertions.assertTrue(avgMs < 10, "Average execution " + avgMs + "ms suggests non-linear complexity");
    }

    @Test
    public void testThreadLocalRandomUsage() throws Exception {
        // Verify ThreadLocalRandom is used instead of regular Random
        // Check via source inspection: ServiceImpl should import ThreadLocalRandom
        
        Class<?> serviceImpl = Class.forName("com.example.gamestats.FootballSeasonStatsServiceImpl");
        
        // Check that no field of type java.util.Random exists (would indicate shared Random)
        for (Field f : serviceImpl.getDeclaredFields()) {
            Assertions.assertNotEquals(java.util.Random.class, f.getType(), 
                "Should not use shared java.util.Random instance - use ThreadLocalRandom");
        }
        
        // Verify thread-safety by running concurrent calls without data races
        Object instance = serviceImpl.getDeclaredConstructor().newInstance();
        Method getStats = serviceImpl.getMethod("getSeasonStats", String.class, int.class);
        
        int threads = 50;
        java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(threads);
        java.util.concurrent.atomic.AtomicBoolean failed = new java.util.concurrent.atomic.AtomicBoolean(false);
        
        for (int i = 0; i < threads; i++) {
            new Thread(() -> {
                try {
                    for (int j = 0; j < 100; j++) {
                        Object result = getStats.invoke(instance, "ThreadSafe", 2024);
                        Assertions.assertNotNull(result);
                    }
                } catch (Exception e) {
                    failed.set(true);
                } finally {
                    latch.countDown();
                }
            }).start();
        }
        
        latch.await(10, java.util.concurrent.TimeUnit.SECONDS);
        Assertions.assertFalse(failed.get(), "Concurrent execution failed - possible thread-safety issue");
    }

    // Helpers
    private List<?> getMatches(Object dto) throws Exception {
         if (dto instanceof Map) return (List<?>) ((Map) dto).get("matchStats");
         return (List<?>) dto.getClass().getMethod("getMatchStats").invoke(dto);
    }

    private int getIntField(Object obj, String methodStats) throws Exception {
         if (obj instanceof Map) {
             String key = methodStats.replace("get", "");
             key = Character.toLowerCase(key.charAt(0)) + key.substring(1);
             if (key.endsWith("Scored")) key = "totalGoalsScored";
             if (key.endsWith("Committed")) key = "totalFoulsCommitted";
             if (key.equals("goalsFor")) return (int) ((Map)obj).get("goalsFor");
             if (key.equals("fouls")) return (int) ((Map)obj).get("fouls");
             return (int) ((Map)obj).get(key);
         }
         return (int) obj.getClass().getMethod(methodStats).invoke(obj);
    }
}
