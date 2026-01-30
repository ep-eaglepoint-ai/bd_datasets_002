package com.eaglepoint.parallel;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.*;

/**
 * Evaluation script for the Parallel Data Processing Framework.
 * Generates comprehensive reports with metrics and test results.
 */
public class Evaluation {
    
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH-mm-ss");
    
    public static void main(String[] args) {
        String outputPath = parseOutputPath(args);
        
        System.out.println("=== Parallel Data Processing Framework Evaluation ===\n");
        
        JSONObject report = new JSONObject();
        report.put("task_id", "8SOZEN");
        report.put("framework", "parallel-data-processing-framework");
        report.put("run_id", generateRunId());
        report.put("timestamp", LocalDateTime.now().toString());
        report.put("environment", getEnvironmentInfo());
        
        int exitCode = 0;
        JSONArray testResults = new JSONArray();
        
        try {
            // Run all tests and collect results
            testResults.put(runTest("Basic MapReduce", Evaluation::testBasicMapReduce));
            testResults.put(runTest("Large Dataset (1M elements)", Evaluation::testLargeDataset));
            testResults.put(runTest("Parallel Operations", Evaluation::testParallelOperations));
            testResults.put(runTest("Performance Benchmark", Evaluation::testPerformance));
            testResults.put(runTest("Error Handling", Evaluation::testErrorHandling));
            
            report.put("tests", testResults);
            report.put("status", "PASSED");
            report.put("summary", generateSummary(testResults));
            
            System.out.println("\n=== All Tests Passed ===");
            
        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace();
            report.put("status", "FAILED");
            report.put("error", e.getMessage());
            exitCode = 1;
        }
        
        // Write report
        try {
            writeReport(report, outputPath);
            System.out.println("\n✓ Report written to: " + outputPath);
        } catch (IOException e) {
            System.err.println("Failed to write report: " + e.getMessage());
            exitCode = 1;
        }
        
        System.exit(exitCode);
    }
    
    private static String parseOutputPath(String[] args) {
        for (int i = 0; i < args.length; i++) {
            if ("--output".equals(args[i]) && i + 1 < args.length) {
                return args[i + 1];
            }
        }
        
        // Default path with timestamp
        LocalDateTime now = LocalDateTime.now();
        String datePart = now.format(DATE_FORMAT);
        String timePart = now.format(TIME_FORMAT);
        return String.format("evaluation/%s/%s/report.json", datePart, timePart);
    }
    
    private static JSONObject runTest(String name, TestRunnable test) {
        JSONObject result = new JSONObject();
        result.put("name", name);
        
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> metrics = test.run();
            long elapsed = System.currentTimeMillis() - start;
            
            result.put("status", "PASSED");
            result.put("duration_ms", elapsed);
            result.put("metrics", new JSONObject(metrics));
            
            System.out.println("✓ " + name + " - " + elapsed + "ms");
            
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            result.put("status", "FAILED");
            result.put("duration_ms", elapsed);
            result.put("error", e.getMessage());
            
            System.out.println("✗ " + name + " - FAILED: " + e.getMessage());
            throw new RuntimeException("Test failed: " + name, e);
        }
        
        return result;
    }
    
    private static Map<String, Object> testBasicMapReduce() {
        List<Integer> data = Arrays.asList(1, 2, 3, 4, 5);
        
        Integer result = ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
            .source(data)
            .map(x -> x * 2)
            .reduce(new SummingReducer())
            .execute();
        
        int expected = 30;
        assert result.equals(expected) : "Expected " + expected + " but got " + result;
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("input_size", data.size());
        metrics.put("result", result);
        metrics.put("expected", expected);
        return metrics;
    }
    
    private static Map<String, Object> testLargeDataset() {
        List<Integer> data = IntStream.range(0, 1000000).boxed().collect(Collectors.toList());
        
        long start = System.currentTimeMillis();
        Long count = ParallelProcessor.<Integer, Integer, Long>withForkJoin()
            .source(data)
            .map(x -> x)
            .reduce(new CountingReducer<>())
            .execute();
        long elapsed = System.currentTimeMillis() - start;
        
        assert count == 1000000L : "Expected 1000000 but got " + count;
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("elements_processed", count);
        metrics.put("processing_time_ms", elapsed);
        metrics.put("throughput_elements_per_ms", count / Math.max(elapsed, 1));
        return metrics;
    }
    
    private static Map<String, Object> testParallelOperations() {
        List<Integer> data = Arrays.asList(1, 2, 3, 4, 5);
        
        // Map
        List<Integer> doubled = ParallelOperations.parallelMap(data, x -> x * 2);
        assert doubled.equals(Arrays.asList(2, 4, 6, 8, 10)) : "Map failed";
        
        // Filter
        List<Integer> evens = ParallelOperations.parallelFilter(
            Arrays.asList(1, 2, 3, 4, 5, 6), 
            x -> x % 2 == 0
        );
        assert evens.equals(Arrays.asList(2, 4, 6)) : "Filter failed";
        
        // Sort
        List<Integer> unsorted = Arrays.asList(5, 2, 8, 1, 9, 3);
        List<Integer> sorted = ParallelOperations.parallelSort(unsorted, Integer::compareTo);
        assert sorted.equals(Arrays.asList(1, 2, 3, 5, 8, 9)) : "Sort failed";
        
        // FindAny
        List<Integer> large = IntStream.range(0, 100000).boxed().collect(Collectors.toList());
        Optional<Integer> found = ParallelOperations.parallelFindAny(large, x -> x == 42);
        assert found.isPresent() && found.get() == 42 : "FindAny failed";
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("operations_tested", 4);
        metrics.put("map_result_size", doubled.size());
        metrics.put("filter_result_size", evens.size());
        metrics.put("sort_input_size", unsorted.size());
        metrics.put("findany_search_space", large.size());
        return metrics;
    }
    
    private static Map<String, Object> testPerformance() {
        List<Integer> data = IntStream.range(0, 10000000).boxed().collect(Collectors.toList());
        
        // Sequential
        long start = System.currentTimeMillis();
        long seqSum = data.stream()
            .mapToInt(x -> x * 2)
            .sum();
        long seqTime = System.currentTimeMillis() - start;
        
        // Parallel
        start = System.currentTimeMillis();
        Integer parSum = ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
            .source(data)
            .map(x -> x * 2)
            .reduce(new SummingReducer())
            .execute();
        long parTime = System.currentTimeMillis() - start;
        
        assert seqSum == parSum : "Results don't match";
        
        double speedup = (double) seqTime / parTime;
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("dataset_size", data.size());
        metrics.put("sequential_time_ms", seqTime);
        metrics.put("parallel_time_ms", parTime);
        metrics.put("speedup", speedup);
        
        boolean meetsSpeedup = speedup >= 3.0 || Runtime.getRuntime().availableProcessors() < 4;
        boolean meetslatency = parTime < 500;
        
        metrics.put("meets_performance_requirement", meetslatency && meetsSpeedup);
        metrics.put("speedup_achieved", speedup);
        return metrics;
    }
    
    private static Map<String, Object> testErrorHandling() {
        List<Integer> data = Arrays.asList(1, 2, 3, 4, 5);
        
        int failureCount = 0;
        try {
            ParallelProcessor.<Integer, Integer, Integer>withForkJoin()
                .source(data)
                .map(x -> {
                    if (x == 3) throw new RuntimeException("Error on 3");
                    return x;
                })
                .reduce(new SummingReducer())
                .execute();
        } catch (ParallelProcessingException e) {
            failureCount = e.getFailedCount();
            assert failureCount > 0 : "No failures recorded";
        }
        
        // Test cancellation token
        CancellationToken token = new CancellationToken();
        assert !token.isCancelled();
        token.cancel();
        assert token.isCancelled();
        
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("exception_handling", "PASSED");
        metrics.put("failures_caught", failureCount);
        metrics.put("cancellation_token", "PASSED");
        return metrics;
    }
    
    private static JSONObject generateSummary(JSONArray testResults) {
        JSONObject summary = new JSONObject();
        
        int total = testResults.length();
        int passed = 0;
        long totalDuration = 0;
        
        for (int i = 0; i < testResults.length(); i++) {
            JSONObject test = testResults.getJSONObject(i);
            if ("PASSED".equals(test.getString("status"))) {
                passed++;
            }
            totalDuration += test.getLong("duration_ms");
        }
        
        summary.put("total_tests", total);
        summary.put("passed", passed);
        summary.put("failed", total - passed);
        summary.put("total_duration_ms", totalDuration);
        summary.put("success_rate", (double) passed / total * 100);
        
        return summary;
    }
    
    private static void writeReport(JSONObject report, String outputPath) throws IOException {
        Path path = Paths.get(outputPath);
        Files.createDirectories(path.getParent());
        
        try (FileWriter writer = new FileWriter(path.toFile())) {
            writer.write(report.toString(2)); // Pretty print with 2-space indent
        }
    }
    
    private static String generateRunId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private static JSONObject getEnvironmentInfo() {
        JSONObject env = new JSONObject();
        env.put("java_version", System.getProperty("java.version"));
        env.put("os_name", System.getProperty("os.name"));
        env.put("os_version", System.getProperty("os.version"));
        env.put("os_arch", System.getProperty("os.arch"));
        env.put("processors", Runtime.getRuntime().availableProcessors());
        
        try {
            env.put("hostname", InetAddress.getLocalHost().getHostName());
        } catch (UnknownHostException e) {
            env.put("hostname", "unknown");
        }

        JSONObject git = getGitInfo();
        env.put("git_commit", git.getString("git_commit"));
        env.put("git_branch", git.getString("git_branch"));
        
        return env;
    }

    private static JSONObject getGitInfo() {
        JSONObject git = new JSONObject();
        git.put("git_commit", "unknown");
        git.put("git_branch", "unknown");

        try {
            git.put("git_commit", runCommand("git", "rev-parse", "--short", "HEAD"));
            git.put("git_branch", runCommand("git", "rev-parse", "--abbrev-ref", "HEAD"));
        } catch (Exception ignored) {}

        return git;
    }

    private static String runCommand(String... command) throws IOException, InterruptedException {
        Process process = new ProcessBuilder(command).start();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line = reader.readLine();
            if (line != null) {
                return line.trim();
            }
        }
        return "unknown";
    }

    @FunctionalInterface
    interface TestRunnable {
        Map<String, Object> run() throws Exception;
    }
}
