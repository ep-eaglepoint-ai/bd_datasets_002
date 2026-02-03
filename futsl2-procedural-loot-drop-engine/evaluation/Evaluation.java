package evaluation;

import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

/**
 * Evaluation engine for Java/Maven LootDropEngine project.
 * 
 * This class evaluates the repository_after implementation against the requirements
 * and produces a machine-readable JSON report.
 * 
 * Required Python Contract (implemented in Java):
 * - runEvaluation() -> Map<String, Object>
 * - main() -> int
 */
public class Evaluation {
    
    private static final Path PROJECT_ROOT;
    private static final Path REPORTS_DIR;
    private static final Path REPO_BEFORE;
    private static final Path REPO_AFTER;
    private static final int TEST_TIMEOUT_SECONDS = 300;
    
    static {
        // Get the project root directory (parent of evaluation folder)
        Path currentDir = Paths.get("").toAbsolutePath();
        PROJECT_ROOT = currentDir;
        REPORTS_DIR = PROJECT_ROOT.resolve("evaluation").resolve("reports");
        REPO_BEFORE = PROJECT_ROOT.resolve("repository_before");
        REPO_AFTER = PROJECT_ROOT.resolve("repository_after");
    }
    
    /**
     * Main entry point for the evaluation script.
     */
    public static void main(String[] args) {
        // Ensure reports directory exists
        try {
            Files.createDirectories(REPORTS_DIR);
        } catch (IOException e) {
            System.err.println("Failed to create reports directory: " + e.getMessage());
            System.exit(1);
        }
        
        // Run evaluation
        Map<String, Object> report = runEvaluation();
        
        // Write report
        Path reportPath = REPORTS_DIR.resolve("latest.json");
        try {
            String json = toJson(report);
            Files.writeString(reportPath, json);
            System.out.println("Report written to: " + reportPath);
        } catch (IOException e) {
            System.err.println("Failed to write report: " + e.getMessage());
            System.exit(1);
        }
        
        System.out.println("Duration: " + report.get("duration_seconds") + "s");
        System.out.println("Success: " + report.get("success"));
        
        // Exit with appropriate code
        int exitCode = (Boolean) report.get("success") ? 0 : 1;
        System.exit(exitCode);
    }
    
    /**
     * Main evaluation function that compares before and after repositories.
     * 
     * @return Map containing the complete evaluation report
     */
    public static Map<String, Object> runEvaluation() {
        String runId = UUID.randomUUID().toString();
        Instant startTime = Instant.now();
        
        // Evaluate both repositories
        Map<String, Object> beforeResult = evaluateRepositoryBefore();
        Map<String, Object> afterResult = evaluateRepositoryAfter();
        
        // Determine if the after implementation passes
        boolean afterTestsPassed = (Boolean) ((Map<?, ?>)afterResult.get("tests")).get("passed");
        
        // Generate comparison summary
        String improvementSummary = afterTestsPassed 
            ? "After implementation passed all correctness tests"
            : "After implementation failed one or more tests";
        
        Instant endTime = Instant.now();
        double durationSeconds = Duration.between(startTime, endTime).toMillis() / 1000.0;
        
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("run_id", runId);
        report.put("started_at", startTime.toString() + "Z");
        report.put("finished_at", endTime.toString() + "Z");
        report.put("duration_seconds", durationSeconds);
        report.put("environment", environmentInfo());
        report.put("before", beforeResult);
        report.put("after", afterResult);
        
        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("passed_gate", afterTestsPassed);
        comparison.put("improvement_summary", improvementSummary);
        report.put("comparison", comparison);
        
        report.put("success", afterTestsPassed);
        report.put("error", null);
        
        return report;
    }
    
    /**
     * Collect environment information.
     */
    private static Map<String, Object> environmentInfo() {
        Map<String, Object> env = new LinkedHashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("platform", System.getProperty("os.name") + " " + System.getProperty("os.arch"));
        env.put("maven_version", getMavenVersion());
        return env;
    }
    
    /**
     * Get Maven version if available.
     */
    private static String getMavenVersion() {
        try {
            Process proc = new ProcessBuilder("mvn", "-version")
                .redirectErrorStream(true)
                .start();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(proc.getInputStream()))) {
                String firstLine = reader.readLine();
                return firstLine != null ? firstLine : "Unknown";
            }
        } catch (IOException e) {
            return "Not found";
        }
    }
    
    /**
     * Run Maven tests for the given repository path.
     * 
     * @param repoPath Path to the repository
     * @return Map with test results
     */
    private static Map<String, Object> runMavenTests(Path repoPath) {
        Path pomFile = repoPath.resolve("pom.xml");
        
        if (!Files.exists(pomFile)) {
            return resultMap(false, -1, "No pom.xml found in " + repoPath);
        }
        
        try {
            ProcessBuilder pb = new ProcessBuilder("mvn", "-f", pomFile.toString(), "test");
            pb.directory(repoPath.toFile());
            pb.redirectErrorStream(true);
            
            Process proc = pb.start();
            
            // Read output while waiting for completion
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(proc.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            
            boolean completed = proc.waitFor(TEST_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!completed) {
                proc.destroyForcibly();
                return resultMap(false, -1, "Maven test execution timed out (" + TEST_TIMEOUT_SECONDS + "s)");
            }
            
            int returnCode = proc.exitValue();
            String outputStr = output.toString();
            
            // Truncate output to max 8000 characters
            if (outputStr.length() > 8000) {
                outputStr = outputStr.substring(0, 8000) + "\n... [output truncated]";
            }
            
            return resultMap(returnCode == 0, returnCode, outputStr);
            
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return resultMap(false, -1, "Test execution interrupted: " + e.getMessage());
        } catch (IOException e) {
            return resultMap(false, -1, "Error running tests: " + e.getMessage());
        }
    }
    
    /**
     * Create a result map with consistent structure.
     */
    private static Map<String, Object> resultMap(boolean passed, int returnCode, String output) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("passed", passed);
        result.put("return_code", returnCode);
        result.put("output", output);
        return result;
    }
    
    /**
     * Evaluate repository_before.
     * 
     * Since repository_before only contains .gitkeep, there's nothing to test.
     */
    private static Map<String, Object> evaluateRepositoryBefore() {
        // Check if there's actual content to test
        boolean hasContent = false;
        try (Stream<Path> stream = Files.walk(REPO_BEFORE)) {
            hasContent = stream.anyMatch(path -> 
                Files.isRegularFile(path) && !path.toString().endsWith(".gitkeep")
            );
        } catch (IOException e) {
            // If we can't read the directory, assume no content
        }
        
        Map<String, Object> result = new LinkedHashMap<>();
        if (!hasContent) {
            result.put("tests", resultMap(false, 1, 
                "Nothing to test in repository_before - no implementation present"));
            result.put("metrics", new LinkedHashMap<>());
        } else {
            result.put("tests", runMavenTests(REPO_BEFORE));
            result.put("metrics", new LinkedHashMap<>());
        }
        return result;
    }
    
    /**
     * Evaluate repository_after.
     * 
     * Runs Maven tests to verify all requirements are met.
     */
    private static Map<String, Object> evaluateRepositoryAfter() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tests", runMavenTests(REPO_AFTER));
        result.put("metrics", new LinkedHashMap<>());
        return result;
    }
    
    /**
     * Convert a Map to JSON string (simple implementation).
     * Handles nested Maps, Lists, primitives, and booleans.
     */
    private static String toJson(Object obj) {
        StringBuilder sb = new StringBuilder();
        toJson(sb, obj, 0);
        return sb.toString();
    }
    
    private static void toJson(StringBuilder sb, Object obj, int indent) {
        if (obj == null) {
            sb.append("null");
        } else if (obj instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) obj;
            sb.append("{\n");
            String indentStr = "  ".repeat(indent);
            String indentStrNext = "  ".repeat(indent + 1);
            int i = 0;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (i > 0) sb.append(",\n");
                sb.append(indentStrNext).append("\"").append(escapeJson(entry.getKey().toString())).append("\": ");
                toJson(sb, entry.getValue(), indent + 1);
                i++;
            }
            sb.append("\n").append(indentStr).append("}");
        } else if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            sb.append("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(", ");
                toJson(sb, list.get(i), indent);
            }
            sb.append("]");
        } else if (obj instanceof String) {
            sb.append("\"").append(escapeJson(obj.toString())).append("\"");
        } else if (obj instanceof Number || obj instanceof Boolean) {
            sb.append(obj.toString());
        } else {
            sb.append("\"").append(escapeJson(obj.toString())).append("\"");
        }
    }
    
    /**
     * Escape special characters for JSON string.
     */
    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
