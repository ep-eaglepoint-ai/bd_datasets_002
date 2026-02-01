

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.*;
import java.util.stream.Collectors;

/**
 * Evaluation runner for Parallel Data Processing Framework.
 * This evaluation script:
 * - Runs maven tests
 * - Collects individual test results with pass/fail status
 * - Generates structured reports with environment metadata
 */
public class Evaluation {

    public static void main(String[] args) {
        new Evaluation().run(args);
    }

    @SuppressWarnings("unchecked")
    private void run(String[] args) {
        String runId = generateRunId();
        LocalDateTime startedAt = LocalDateTime.now();

        System.out.println("Run ID: " + runId);
        System.out.println("Started at: " + startedAt);

        Map<String, Object> results = runEvaluation();

        // Check success
        boolean success = false;
        String errorMessage = "After implementation tests failed";
        
        if (results != null && results.containsKey("after")) {
            Map<String, Object> afterResults = (Map<String, Object>) results.get("after");
            if (Boolean.TRUE.equals(afterResults.get("success"))) {
                success = true;
                errorMessage = null;
            }
        }

        LocalDateTime finishedAt = LocalDateTime.now();
        double duration = java.time.Duration.between(startedAt, finishedAt).toMillis() / 1000.0;

        Map<String, Object> environment = getEnvironmentInfo();

        // Build report map (LinkedHashMap for strict order matching)
        Map<String, Object> report = new LinkedHashMap<>();
        report.put("run_id", runId);
        report.put("started_at", startedAt.toString());
        report.put("finished_at", finishedAt.toString());
        report.put("duration_seconds", Math.round(duration * 1000000.0) / 1000000.0);
        report.put("success", success);
        report.put("error", errorMessage);
        report.put("environment", environment);
        report.put("results", results);

        // Save report
        String outputPathStr = null;
        for (int i = 0; i < args.length; i++) {
            if ("--output".equals(args[i]) && i + 1 < args.length) {
                outputPathStr = args[i + 1];
                break;
            }
        }
        
        Path outputPath;
        if (outputPathStr != null) {
            outputPath = Paths.get(outputPathStr);
        } else {
            outputPath = generateOutputPath();
        }

        try {
            Files.createDirectories(outputPath.getParent());
            writeJson(report, outputPath);
            System.out.println("\n✅ Report saved to: " + outputPath);
        } catch (IOException e) {
            System.err.println("Failed to write report: " + e.getMessage());
        }

        System.out.println("\n" + "=".repeat(100));
        System.out.println("EVALUATION COMPLETE");
        System.out.println("=".repeat(100));
        System.out.println("Run ID: " + runId);
        System.out.printf("Duration: %.2fs%n", duration);
        System.out.println("Success: " + (success ? "✅ YES" : "❌ NO"));

        System.exit(success ? 0 : 1);
    }

    private Map<String, Object> runEvaluation() {
        System.out.println("\n" + "=".repeat(100));
        System.out.println("PARALLEL PROCESSING FRAMEWORK EVALUATION");
        System.out.println("=".repeat(100));

        // Run tests via Maven
        Map<String, Object> afterResults = runMavenTests("after (repository_after)");

        System.out.println("\n" + "=".repeat(100));
        System.out.println("EVALUATION SUMMARY");
        System.out.println("=".repeat(100));

        boolean success = Boolean.TRUE.equals(afterResults.get("success"));
        System.out.println("\nAfter Implementation (repository_after):");
        System.out.println("  Overall: " + (success ? "✅ PASSED" : "❌ FAILED"));

        System.out.println("\n" + "=".repeat(100));
        System.out.println("EXPECTED BEHAVIOR CHECK");
        System.out.println("=".repeat(100));

        if (success) {
            System.out.println("✅ After implementation: All tests passed (expected)");
        } else {
            System.out.println("❌ After implementation: Some tests failed (unexpected - should pass all)");
        }

        Map<String, Object> results = new LinkedHashMap<>();
        results.put("after", afterResults);
        return results;
    }

    private Map<String, Object> runMavenTests(String label) {
        System.out.println("\n" + "=".repeat(100));
        System.out.println("RUNNING TESTS AFTER FEATURE IMPLEMENTATION: " + label.toUpperCase());
        System.out.println("=".repeat(100));

        List<String> cmd = new ArrayList<>();
        String os = System.getProperty("os.name").toLowerCase();
        if (os.contains("win")) {
            cmd.add("cmd.exe");
            cmd.add("/c");
            cmd.add("mvn");
        } else {
            cmd.add("mvn");
        }
        cmd.add("clean");
        cmd.add("test");

        StringBuilder stdout = new StringBuilder();
        StringBuilder stderr = new StringBuilder();
        int exitCode = -1;

        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.directory(new File(".")); 
            Process p = pb.start();

            Thread outThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stdout.append(line).append("\n");
                        System.out.println(line); 
                    }
                } catch (IOException e) { e.printStackTrace(); }
            });
            
            Thread errThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(p.getErrorStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stderr.append(line).append("\n");
                        System.err.println(line);
                    }
                } catch (IOException e) { e.printStackTrace(); }
            });

            outThread.start();
            errThread.start();
            
            exitCode = p.waitFor();
            outThread.join();
            errThread.join();

        } catch (Exception e) {
            System.out.println("❌ Error running maven tests: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", false);
            result.put("exit_code", -1);
            result.put("tests", new ArrayList<>());
            result.put("summary", Map.of("error", e.getMessage()));
            result.put("stdout", "");
            result.put("stderr", "");
            return result;
        }

        List<Map<String, Object>> tests = parseSurefireReports();
        
        long passed = tests.stream().filter(t -> "passed".equals(t.get("outcome"))).count();
        long failed = tests.stream().filter(t -> "failed".equals(t.get("outcome"))).count();
        long errors = tests.stream().filter(t -> "error".equals(t.get("outcome"))).count();
        long skipped = tests.stream().filter(t -> "skipped".equals(t.get("outcome"))).count();
        long total = tests.size();

        System.out.printf("\nResults: %d passed, %d failed, %d errors, %d skipped (total: %d)%n", passed, failed, errors, skipped, total);

        for (Map<String, Object> test : tests) {
            String outcome = (String) test.get("outcome");
            String icon = "❓";
            if ("passed".equals(outcome)) icon = "✅";
            else if ("failed".equals(outcome)) icon = "❌";
            else if ("error".equals(outcome)) icon = "💥";
            else if ("skipped".equals(outcome)) icon = "⏭️";
            
            System.out.printf("  %s %s: %s%n", icon, test.get("nodeid"), outcome);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", total);
        summary.put("passed", passed);
        summary.put("failed", failed);
        summary.put("errors", errors);
        summary.put("skipped", skipped);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", exitCode == 0 && failed == 0 && errors == 0 && total > 0);
        result.put("exit_code", exitCode);
        result.put("tests", tests);
        result.put("summary", summary);
        
        String outStr = stdout.toString();
        String errStr = stderr.toString();
        result.put("stdout", outStr.length() > 3000 ? outStr.substring(outStr.length() - 3000) : outStr);
        result.put("stderr", errStr.length() > 1000 ? errStr.substring(errStr.length() - 1000) : errStr);

        return result;
    }

    private List<Map<String, Object>> parseSurefireReports() {
        List<Map<String, Object>> tests = new ArrayList<>();
        File reportDir = new File("target/surefire-reports");
        if (!reportDir.exists() || !reportDir.isDirectory()) {
            return tests;
        }

        File[] files = reportDir.listFiles((dir, name) -> name.endsWith(".xml"));
        if (files == null) return tests;

        for (File file : files) {
            try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                String line;
                String currentTestCase = null;
                boolean failure = false;
                boolean error = false;
                boolean skipped = false;
                
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.startsWith("<testcase")) {
                        String name = extractAttr(line, "name");
                        String classname = extractAttr(line, "classname");
                        currentTestCase = classname + "::" + name;
                        failure = false; 
                        error = false; 
                        skipped = false;
                        
                        if (line.endsWith("/>")) {
                            addTestResult(tests, currentTestCase, "passed");
                            currentTestCase = null;
                        }
                    } else if (currentTestCase != null) {
                        if (line.startsWith("<failure")) failure = true;
                        if (line.startsWith("<error")) error = true;
                        if (line.startsWith("<skipped")) skipped = true;
                        
                        if (line.startsWith("</testcase>")) {
                            String outcome = "passed";
                            if (failure) outcome = "failed";
                            else if (error) outcome = "error";
                            else if (skipped) outcome = "skipped";
                            
                            addTestResult(tests, currentTestCase, outcome);
                            currentTestCase = null;
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Error parsing XML report " + file.getName() + ": " + e.getMessage());
            }
        }
        return tests;
    }

    private void addTestResult(List<Map<String, Object>> tests, String nodeid, String outcome) {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("nodeid", nodeid);
        t.put("name", nodeid.substring(nodeid.lastIndexOf("::") + 2));
        t.put("outcome", outcome);
        tests.add(t);
    }

    private String extractAttr(String line, String attr) {
        Pattern p = Pattern.compile(attr + "=\"([^\"]*)\"");
        Matcher m = p.matcher(line);
        if (m.find()) return m.group(1);
        return "unknown";
    }

    private String generateRunId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private Map<String, Object> getEnvironmentInfo() {
        Map<String, Object> env = new LinkedHashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("platform", System.getProperty("os.name") + " " + System.getProperty("os.version"));
        env.put("os", System.getProperty("os.name"));
        env.put("os_release", System.getProperty("os.version"));
        env.put("architecture", System.getProperty("os.arch"));
        try {
            env.put("hostname", java.net.InetAddress.getLocalHost().getHostName());
        } catch (Exception e) {
            env.put("hostname", "unknown");
        }
        
        Map<String, String> git = getGitInfo();
        env.put("git_commit", git.get("git_commit"));
        env.put("git_branch", git.get("git_branch"));
        
        return env;
    }

    private Map<String, String> getGitInfo() {
        Map<String, String> info = new HashMap<>();
        info.put("git_commit", "unknown");
        info.put("git_branch", "unknown");
        try {
            info.put("git_commit", execCmd("git", "rev-parse", "HEAD").substring(0, 8));
            info.put("git_branch", execCmd("git", "rev-parse", "--abbrev-ref", "HEAD"));
        } catch (Exception e) {}
        return info;
    }

    private String execCmd(String... cmd) throws Exception {
        Process p = new ProcessBuilder(cmd).start();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            return br.readLine();
        }
    }

    private Path generateOutputPath() {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH-mm-ss");
        return Paths.get("evaluation", now.format(dateFmt), now.format(timeFmt), "report.json");
    }

    private void writeJson(Map<String, Object> data, Path path) throws IOException {
        try (BufferedWriter writer = Files.newBufferedWriter(path)) {
            writer.write(toJson(data, 0));
        }
    }

    private String toJson(Object o, int indent) {
        String pad = " ".repeat(indent);
        if (o == null) return "null";
        if (o instanceof String) return "\"" + escapeJson((String) o) + "\"";
        if (o instanceof Number || o instanceof Boolean) return o.toString();
        
        if (o instanceof Map) {
            Map<?, ?> m = (Map<?, ?>) o;
            if (m.isEmpty()) return "{}";
            StringBuilder sb = new StringBuilder();
            sb.append("{\n");
            int i = 0;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                sb.append(pad).append("  ").append("\"").append(e.getKey()).append("\": ");
                sb.append(toJson(e.getValue(), indent + 2));
                if (++i < m.size()) sb.append(",");
                sb.append("\n");
            }
            sb.append(pad).append("}");
            return sb.toString();
        }
        
        if (o instanceof List) {
            List<?> l = (List<?>) o;
            if (l.isEmpty()) return "[]";
            StringBuilder sb = new StringBuilder();
            sb.append("[\n");
            int i = 0;
            for (Object e : l) {
                sb.append(pad).append("  ").append(toJson(e, indent + 2));
                if (++i < l.size()) sb.append(",");
                sb.append("\n");
            }
            sb.append(pad).append("]");
            return sb.toString();
        }
        
        return "\"" + o.toString() + "\"";
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\b", "\\b")
        .replace("\f", "\\f")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t");
    }
}
