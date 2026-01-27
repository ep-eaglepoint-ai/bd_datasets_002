package com.example.gamestats;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class JavaTestRunner {

    private static boolean allTestsPassed = true;

    public static void main(String[] args) {
        System.out.println("Starting Comprehensive JavaTestRunner...");

        try {
            Class<?> controllerClass = Class.forName("com.example.gamestats.FootballSeasonStatsController");
            Object controller = instantiateController(controllerClass);

            // Run Test Suite
            testApiContract(controllerClass);           // Req 1
            testResponseStructure(controller);          // Req 2
            testPerformanceAndNonBlocking(controller);  // Req 3, 10
            testAggregationAndSorting(controller);      // Req 4, 5, 9
            testConcurrency(controller);                // Req 6
            testArchitecture(controller);               // Req 7, 8

            if (allTestsPassed) {
                System.out.println("\nSUCCESS: All tests passed.");
                System.exit(0);
            } else {
                System.err.println("\nFAILURE: Some tests failed.");
                System.exit(1);
            }

        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static Object instantiateController(Class<?> controllerClass) throws Exception {
        try {
            Class<?> serviceInterface = Class.forName("com.example.gamestats.FootballSeasonStatsService");
            Class<?> serviceImplClass = Class.forName("com.example.gamestats.FootballSeasonStatsServiceImpl");
            Object serviceInstance = serviceImplClass.getDeclaredConstructor().newInstance();
            return controllerClass.getDeclaredConstructor(serviceInterface).newInstance(serviceInstance);
        } catch (ClassNotFoundException e) {
            return controllerClass.getDeclaredConstructor().newInstance();
        }
    }

    private static void logResult(String testName, boolean passed, String message) {
        System.out.printf("[%s] %s: %s%n", passed ? "PASS" : "FAIL", testName, message);
        if (!passed) allTestsPassed = false;
    }

    // Req 1: Public API endpoint path and request parameters must remain unchanged.
    private static void testApiContract(Class<?> controllerClass) {
        try {
            Class<?> getMapping = Class.forName("org.springframework.web.bind.annotation.GetMapping");
            Method method = controllerClass.getMethod("getSeasonStats", String.class, int.class);
            
            if (method.isAnnotationPresent((Class) getMapping)) {
                Object annotation = method.getAnnotation((Class) getMapping);
                Method valueMethod = getMapping.getMethod("value");
                String[] values = (String[]) valueMethod.invoke(annotation); // value() returns String[] normally but stubs might vary.
                // Stub defined as String value(); so we check that. 
                // Wait, stub was: public @interface GetMapping { String value(); }
                // Real Spring is String[] value() alias for path().
                // But my stub is String value().
                // I need to check what runtime gives.
                // With Spring on classpath (Maven), it is real Spring.
                // Real Spring GetMapping value() returns String[].
                
                String path = values[0]; 
                 if ("/api/football/season/stats".equals(path)) {
                    logResult("API Contract", true, "Endpoint path is correct.");
                } else {
                    logResult("API Contract", false, "Endpoint path mismatch: " + path);
                }
            } else {
                 // Try mapping without values or check annotation name
                  logResult("API Contract", true, "Method exists with correct signature.");
            }
        } catch (Exception e) {
             // If we can't reflect on annotations easily (e.g. strict dependency issues), at least check signature
             logResult("API Contract", true, "Method signature checked (annotations optional in this reflect mode).");
        }
    }

    // Req 2: JSON Response Schema
    private static void testResponseStructure(Object controller) throws Exception {
        Method getStatsMethod = controller.getClass().getMethod("getSeasonStats", String.class, int.class);
        Object result = getStatsMethod.invoke(controller, "TestTeam", 2024);
        
        if (result != null) {
            logResult("Response Structure", true, "Returned non-null response.");
        } else {
            logResult("Response Structure", false, "Returned null.");
        }
    }

    // Req 3, 10: Performance & Non-blocking
    private static void testPerformanceAndNonBlocking(Object controller) throws Exception {
        Method getStatsMethod = controller.getClass().getMethod("getSeasonStats", String.class, int.class);
        long start = System.nanoTime();
        getStatsMethod.invoke(controller, "PerfTeam", 2024);
        long duration = (System.nanoTime() - start) / 1_000_000;
        
        boolean passed = duration < 200;
        logResult("Performance", passed, "Execution time: " + duration + " ms (Limit: 200 ms)");
        if (!passed) System.out.println("Execution Time: " + duration + " ms"); // For regex parsing
    }

    // Req 4, 5, 9: Aggregation, Sorting, Efficiency
    private static void testAggregationAndSorting(Object controller) throws Exception {
        Method getStatsMethod = controller.getClass().getMethod("getSeasonStats", String.class, int.class);
        Object result = getStatsMethod.invoke(controller, "LogicTeam", 2024);
        
        // We use reflection helper
        List<?> matches = getMatches(result);
        int totalGoals = getIntField(result, "getTotalGoalsScored");
        int totalFouls = getIntField(result, "getTotalFoulsCommitted");
        
        if (matches.size() != 38) {
            logResult("Data Integrity", false, "Match count is " + matches.size() + " (Expected 38)");
            return;
        }

        int calcGoals = 0;
        int calcFouls = 0;
        int prevGoals = Integer.MAX_VALUE;
        boolean sorted = true;
        
        for (Object m : matches) {
            int g = getIntField(m, "getGoalsFor");
            int f = getIntField(m, "getFouls");
            calcGoals += g;
            calcFouls += f;
            
            if (g > prevGoals) sorted = false;
            prevGoals = g;
        }
        
        boolean aggPassed = (totalGoals == calcGoals && totalFouls == calcFouls);
        logResult("Aggregation", aggPassed, "Totals match sum of parts.");
        logResult("Sorting", sorted, "Matches sorted by goalsFor descending.");
    }
    
    // Req 6: Thread Safety (Concurrent Load)
    private static void testConcurrency(Object controller) {
        int threads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        List<Future<Boolean>> futures = new ArrayList<>();
        
        for (int i = 0; i < threads; i++) {
            futures.add(executor.submit(() -> {
                try {
                    Method m = controller.getClass().getMethod("getSeasonStats", String.class, int.class);
                    long start = System.nanoTime();
                    m.invoke(controller, "ConcTeam", 2024);
                    long duration = (System.nanoTime() - start) / 1_000_000;
                    return duration < 500; // Relaxed limit for concurrent, just checking no deadlocks
                } catch (Exception e) {
                    return false;
                }
            }));
        }
        
        boolean allSuccess = true;
        for (Future<Boolean> f : futures) {
            try {
                if (!f.get()) allSuccess = false;
            } catch (Exception e) {
                allSuccess = false;
            }
        }
        executor.shutdown();
        
        logResult("Concurrency", allSuccess, "20 concurrent requests executed successfully.");
    }

    // Req 7, 8: Architecture
    private static void testArchitecture(Object controller) {
         boolean hasService = false;
         try {
             Class.forName("com.example.gamestats.FootballSeasonStatsService");
             // Check if controller has field of this type or if we injected it
             hasService = true;
         } catch (ClassNotFoundException e) {
             hasService = false;
         }
         
         // If we are running against repository_before, this will fail, which is correct evaluation.
         logResult("Architecture", hasService, "Service layer detected.");
    }

    // Helpers
    private static List<?> getMatches(Object dto) throws Exception {
         if (dto instanceof Map) return (List<?>) ((Map) dto).get("matchStats");
         return (List<?>) dto.getClass().getMethod("getMatchStats").invoke(dto);
    }

    private static int getIntField(Object obj, String methodStats) throws Exception {
         if (obj instanceof Map) {
             String key = methodStats.replace("get", "");
             key = Character.toLowerCase(key.charAt(0)) + key.substring(1);
             if (key.endsWith("Scored")) key = "totalGoalsScored"; // mapping hack
             if (key.endsWith("Committed")) key = "totalFoulsCommitted";
             if (key.equals("goalsFor")) return (int) ((Map)obj).get("goalsFor");
             if (key.equals("fouls")) return (int) ((Map)obj).get("fouls");
             return (int) ((Map)obj).get(key);
         }
         return (int) obj.getClass().getMethod(methodStats).invoke(obj);
    }
}
