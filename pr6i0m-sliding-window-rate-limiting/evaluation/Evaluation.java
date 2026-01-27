package com.example.evaluation;

import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.*;
import java.util.stream.Collectors;

/**
 * Java-based evaluation script for running tests and generating reports.
 */
public class Evaluation {
    private static final Path JAVA_PACKAGE_PATH = Paths.get("src/main/java/com/example/ratelimiter");
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    
    public static void main(String[] args) {
        try {
            String runId = generateRunId();
            Instant startedAt = Instant.now();
            
            Map<String, Object> results = runEvaluation();
            
            Instant finishedAt = Instant.now();
            double duration = java.time.Duration.between(startedAt, finishedAt).toMillis() / 1000.0;
            
            boolean overallSuccess = Boolean.TRUE.equals(
                ((Map<String, Object>) results.get("after")).get("success")
            );
            
            Map<String, Object> report = new LinkedHashMap<>();
            report.put("run_id", runId);
            report.put("started_at", startedAt.toString());
            report.put("finished_at", finishedAt.toString());
            report.put("duration_seconds", Math.round(duration * 100.0) / 100.0);
            report.put("success", overallSuccess);
            report.put("environment", getEnvironmentInfo());
            report.put("results", results);
            
            // Print requirement validation summary
            Map<String, Object> reqValidation = (Map<String, Object>) results.get("requirements_validation");
            if (reqValidation != null) {
                System.out.println("\n" + "=".repeat(60));
                System.out.println("REQUIREMENT VALIDATION SUMMARY");
                System.out.println("=".repeat(60));
                boolean allMet = Boolean.TRUE.equals(reqValidation.get("all_requirements_met"));
                int passed = ((Number) reqValidation.get("passed_requirements")).intValue();
                int total = ((Number) reqValidation.get("total_requirements")).intValue();
                System.out.println("All Requirements Met: " + (allMet ? "✅ YES" : "❌ NO"));
                System.out.println("Passed: " + passed + " / " + total);
                
                Map<String, Object> reqStatus = (Map<String, Object>) reqValidation.get("requirements");
                if (reqStatus != null) {
                    System.out.println("\nIndividual Requirements:");
                    for (Map.Entry<String, Object> entry : reqStatus.entrySet()) {
                        String status = entry.getValue().toString();
                        System.out.println("  " + entry.getKey() + ": " + status);
                    }
                }
            }
            
            Path outputPath = generateOutputPath();
            outputPath.getParent().toFile().mkdirs();
            
            try (PrintWriter writer = new PrintWriter(new FileWriter(outputPath.toFile()))) {
                writer.println(formatJson(report, 0));
            }
            
            System.out.println("\n✅ Report saved to: " + outputPath);
            
            System.exit(overallSuccess ? 0 : 1);
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private static String generateRunId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
    
    private static Map<String, String> getEnvironmentInfo() {
        Map<String, String> env = new LinkedHashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("java_vendor", System.getProperty("java.vendor"));
        env.put("os_name", System.getProperty("os.name"));
        env.put("os_version", System.getProperty("os.version"));
        return env;
    }
    
    private static Path generateOutputPath() {
        String timestamp = LocalDateTime.now().format(TIMESTAMP_FORMATTER);
        return Paths.get("evaluation", "reports", timestamp, "report.json");
    }
    
    private static Map<String, Object> parseMavenOutput(String output) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", 0);
        summary.put("passed", 0);
        summary.put("failed", 0);
        summary.put("errors", 0);
        summary.put("skipped", 0);
        
        Pattern pattern = Pattern.compile(
            "Tests run: (\\d+), Failures: (\\d+), Errors: (\\d+), Skipped: (\\d+)"
        );
        Matcher matcher = pattern.matcher(output);
        
        if (matcher.find()) {
            int total = Integer.parseInt(matcher.group(1));
            int failures = Integer.parseInt(matcher.group(2));
            int errors = Integer.parseInt(matcher.group(3));
            int skipped = Integer.parseInt(matcher.group(4));
            
            summary.put("total", total);
            summary.put("failed", failures);
            summary.put("errors", errors);
            summary.put("skipped", skipped);
            summary.put("passed", total - failures - errors - skipped);
        }
        
        return summary;
    }
    
    private static Map<String, Object> runMavenTest(String sourceRepoPath, String label) {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("RUNNING TESTS: " + label.toUpperCase());
        System.out.println("=".repeat(60));
        
        Path sourceDir = Paths.get(sourceRepoPath);
        
        if (!Files.exists(sourceDir)) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("error", "Source directory not found: " + sourceDir);
            result.put("summary", summary);
            return result;
        }
        
        try {
            List<Path> javaFiles = Files.list(sourceDir)
                .filter(p -> p.toString().endsWith(".java"))
                .collect(Collectors.toList());
            
            if (javaFiles.isEmpty()) {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("success", false);
                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("error", "No .java files found in: " + sourceDir);
                result.put("summary", summary);
                return result;
            }
            
            // Clean up existing .java files in the package directory
            if (Files.exists(JAVA_PACKAGE_PATH)) {
                Files.list(JAVA_PACKAGE_PATH)
                    .filter(p -> p.toString().endsWith(".java"))
                    .forEach(p -> {
                        try {
                            Files.delete(p);
                        } catch (IOException e) {
                            // Ignore
                        }
                    });
            }
            
            // Copy Java files
            JAVA_PACKAGE_PATH.toFile().mkdirs();
            for (Path sourceFile : javaFiles) {
                Path destFile = JAVA_PACKAGE_PATH.resolve(sourceFile.getFileName());
                System.out.println("Copying " + sourceFile + " -> " + destFile);
                Files.copy(sourceFile, destFile, StandardCopyOption.REPLACE_EXISTING);
            }
            
            ProcessBuilder pb = new ProcessBuilder("mvn", "test", "-Dtest=RateLimiterTest");
            pb.directory(new File("."));
            Process process = pb.start();
            
            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());
            
            int exitCode = process.waitFor();
            boolean success = (exitCode == 0);
            
            Map<String, Object> summary = parseMavenOutput(stdout);
            
            System.out.println("Result: " + (success ? "✅ SUCCESS" : "❌ FAILURE"));
            
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", success);
            result.put("exit_code", exitCode);
            result.put("summary", summary);
            result.put("stdout", stdout.length() > 3000 ? stdout.substring(stdout.length() - 3000) : stdout);
            result.put("stderr", stderr.length() > 1000 ? stderr.substring(stderr.length() - 1000) : stderr);
            
            return result;
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            Map<String, Object> summary = new LinkedHashMap<>();
            summary.put("error", e.toString());
            result.put("summary", summary);
            return result;
        }
    }
    
    private static String readStream(InputStream stream) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
        }
        return sb.toString();
    }
    
    private static Map<String, Object> validateRequirements(Map<String, Object> testResults) {
        Map<String, Object> requirements = new LinkedHashMap<>();
        boolean allTestsPassed = Boolean.TRUE.equals(testResults.get("success"));
        
        // Requirement validation based on test results
        Map<String, Object> reqStatus = new LinkedHashMap<>();
        
        // If tests pass, assume requirements are met (tests validate them)
        if (allTestsPassed) {
            reqStatus.put("req1_independent_clients", "PASS - Validated by testRequirement1_IndependentClientRateLimiting");
            reqStatus.put("req2_sliding_window", "PASS - Validated by testRequirement2_SlidingTimeWindow");
            reqStatus.put("req3_outside_window_not_counted", "PASS - Validated by testRequirement3_RequestsOutsideWindowNotCounted");
            reqStatus.put("req4_concurrent_safety", "PASS - Validated by testRequirement4_ConcurrentSafety");
            reqStatus.put("req5_large_number_clients", "PASS - Validated by testRequirement5_LargeNumberOfClients");
            reqStatus.put("req6_java_standard_library", "PASS - Validated by testRequirement6_JavaStandardLibraryOnly");
            reqStatus.put("req7_no_global_locks", "PASS - Validated by testRequirement7_NoGlobalLocks");
            reqStatus.put("req8_no_sleep_timing", "PASS - Validated by testRequirement8_NoSleepBasedTiming");
            reqStatus.put("req9_no_external_systems", "PASS - Validated by testRequirement9_NoExternalSystems");
            reqStatus.put("req10_memory_bounded", "PASS - Validated by testRequirement10_MemoryBounded");
            reqStatus.put("req11_valid_requests_not_rejected", "PASS - Validated by testRequirement11_ValidRequestsNotRejected");
            reqStatus.put("req12_no_concurrency_violations", "PASS - Validated by testRequirement12_NoConcurrencyViolations");
        } else {
            reqStatus.put("req1_independent_clients", "FAIL - Tests did not pass");
            reqStatus.put("req2_sliding_window", "FAIL - Tests did not pass");
            reqStatus.put("req3_outside_window_not_counted", "FAIL - Tests did not pass");
            reqStatus.put("req4_concurrent_safety", "FAIL - Tests did not pass");
            reqStatus.put("req5_large_number_clients", "FAIL - Tests did not pass");
            reqStatus.put("req6_java_standard_library", "FAIL - Tests did not pass");
            reqStatus.put("req7_no_global_locks", "FAIL - Tests did not pass");
            reqStatus.put("req8_no_sleep_timing", "FAIL - Tests did not pass");
            reqStatus.put("req9_no_external_systems", "FAIL - Tests did not pass");
            reqStatus.put("req10_memory_bounded", "FAIL - Tests did not pass");
            reqStatus.put("req11_valid_requests_not_rejected", "FAIL - Tests did not pass");
            reqStatus.put("req12_no_concurrency_violations", "FAIL - Tests did not pass");
        }
        
        requirements.put("all_requirements_met", allTestsPassed);
        requirements.put("requirements", reqStatus);
        requirements.put("total_requirements", 12);
        requirements.put("passed_requirements", allTestsPassed ? 12 : 0);
        
        return requirements;
    }
    
    private static Map<String, Object> runEvaluation() {
        JAVA_PACKAGE_PATH.toFile().mkdirs();
        
        Map<String, Object> beforeResults = runMavenTest("repository_before", "before (repository_before)");
        Map<String, Object> afterResults = runMavenTest("repository_after", "after (repository_after)");
        
        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("before_passed", Boolean.TRUE.equals(beforeResults.get("success")));
        comparison.put("after_passed", Boolean.TRUE.equals(afterResults.get("success")));
        
        // Validate requirements for after repository
        Map<String, Object> afterRequirements = validateRequirements(afterResults);
        
        Map<String, Object> results = new LinkedHashMap<>();
        results.put("before", beforeResults);
        results.put("after", afterResults);
        results.put("comparison", comparison);
        results.put("requirements_validation", afterRequirements);
        
        return results;
    }
    
    private static String formatJson(Object obj, int indent) {
        if (obj == null) {
            return "null";
        }
        if (obj instanceof String) {
            return "\"" + escapeJson((String) obj) + "\"";
        }
        if (obj instanceof Number || obj instanceof Boolean) {
            return obj.toString();
        }
        if (obj instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) obj;
            if (map.isEmpty()) {
                return "{}";
            }
            StringBuilder sb = new StringBuilder("{\n");
            String indentStr = "  ".repeat(indent + 1);
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) {
                    sb.append(",\n");
                }
                first = false;
                sb.append(indentStr)
                  .append(formatJson(entry.getKey(), indent + 1))
                  .append(": ")
                  .append(formatJson(entry.getValue(), indent + 1));
            }
            sb.append("\n").append("  ".repeat(indent)).append("}");
            return sb.toString();
        }
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            if (list.isEmpty()) {
                return "[]";
            }
            StringBuilder sb = new StringBuilder("[\n");
            String indentStr = "  ".repeat(indent + 1);
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) {
                    sb.append(",\n");
                }
                sb.append(indentStr).append(formatJson(list.get(i), indent + 1));
            }
            sb.append("\n").append("  ".repeat(indent)).append("]");
            return sb.toString();
        }
        return "\"" + escapeJson(obj.toString()) + "\"";
    }
    
    private static String escapeJson(String str) {
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
}
