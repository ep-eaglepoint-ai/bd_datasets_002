package evaluation;

import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

public class Evaluation {

    public static void main(String[] args) {
        String runId = UUID.randomUUID().toString().substring(0, 8);
        LocalDateTime startTime = LocalDateTime.now();

        System.out.println("Run ID: " + runId);
        System.out.println("Started at: " + startTime);
        System.out.println("\n============================================================");
        System.out.println(" PERFORMANCE OPTIMIZATION EVALUATION ");
        System.out.println("============================================================\n");

        try {
            Map<String, Object> beforeResults = runEvaluation("repository_before", "before (repository_before)");
            Map<String, Object> afterResults = runEvaluation("repository_after", "after (repository_after)");

            LocalDateTime finishedTime = LocalDateTime.now();
            double duration = java.time.Duration.between(startTime, finishedTime).toMillis() / 1000.0;

            boolean success = (boolean) afterResults.get("success");
            String error = success ? null : "After implementation tests failed";

            Map<String, Object> report = new LinkedHashMap<>();
            report.put("run_id", runId);
            report.put("started_at", startTime.toString());
            report.put("finished_at", finishedTime.toString());
            report.put("duration_seconds", duration);
            report.put("success", success);
            report.put("error", error);
            report.put("environment", getEnvironmentInfo());

            Map<String, Object> results = new LinkedHashMap<>();
            results.put("before", beforeResults);
            results.put("after", afterResults);

            Map<String, Object> comparison = new LinkedHashMap<>();
            comparison.put("before_tests_passed", beforeResults.get("success"));
            comparison.put("after_tests_passed", afterResults.get("success"));
            comparison.put("before_total", ((Map) beforeResults.get("summary")).get("total"));
            comparison.put("before_passed", ((Map) beforeResults.get("summary")).get("passed"));
            comparison.put("after_total", ((Map) afterResults.get("summary")).get("total"));
            comparison.put("after_passed", ((Map) afterResults.get("summary")).get("passed"));

            results.put("comparison", comparison);
            report.put("results", results);

            saveReport(report);

            System.out.println("\n============================================================");
            System.out.println("EVALUATION COMPLETE");
            System.out.println("============================================================");
            System.out.println("Run ID: " + runId);
            System.out.println("Duration: " + String.format("%.2f", duration) + "s");
            System.out.println("Success: " + (success ? "✅ YES" : "❌ NO"));

            System.exit(success ? 0 : 1);
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static Map<String, Object> runEvaluation(String repoDir, String label) throws Exception {
        System.out.println("RUNNING TESTS: " + label.toUpperCase());
        System.out.println("------------------------------------------------------------");

        // Setup bins
        Files.createDirectories(Paths.get("bin/" + repoDir));

        // Compile repo
        List<String> repoSources = Files.walk(Paths.get(repoDir + "/src/main/java/com/legal/search"))
                .filter(p -> p.toString().endsWith(".java"))
                .map(Path::toString)
                .collect(Collectors.toList());

        List<String> javacCmd = new ArrayList<>(Arrays.asList("javac", "-d", "bin/" + repoDir));
        javacCmd.addAll(repoSources);
        executeCommand(javacCmd);

        // Compile tests
        Files.createDirectories(Paths.get("bin/tests"));
        List<String> testSources = Files.walk(Paths.get("tests/com/legal/search"))
                .filter(p -> p.toString().endsWith(".java"))
                .map(Path::toString)
                .collect(Collectors.toList());

        List<String> javacTestCmd = new ArrayList<>(Arrays.asList("javac", "-cp", "bin/" + repoDir, "-d", "bin/tests"));
        javacTestCmd.addAll(testSources);
        executeCommand(javacTestCmd);

        // Run tests
        String cp = "bin/tests" + File.pathSeparator + "bin/" + repoDir;
        List<String> javaCmd = Arrays.asList("java", "-cp", cp, "-ea", "com.legal.search.SearchOptimizationTest");

        ProcessBuilder pb = new ProcessBuilder(javaCmd);
        pb.redirectErrorStream(true);
        Process p = pb.start();

        StringBuilder stdout = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
        String line;
        List<Map<String, String>> testResults = new ArrayList<>();

        while ((line = reader.readLine()) != null) {
            System.out.println("  " + line);
            stdout.append(line).append("\n");
            if (line.contains("::") && (line.contains(" PASSED") || line.contains(" FAILED"))) {
                String[] parts = line.trim().split(" ");
                String nodeId = parts[0];
                String outcome = parts[1].toLowerCase();
                Map<String, String> tr = new LinkedHashMap<>();
                tr.put("nodeid", nodeId);
                tr.put("name", nodeId.contains("::") ? nodeId.split("::")[1] : nodeId);
                tr.put("outcome", outcome);
                testResults.add(tr);
            }
        }

        int exitCode = p.waitFor();

        int passed = (int) testResults.stream().filter(r -> r.get("outcome").equals("passed")).count();
        int failed = (int) testResults.stream().filter(r -> r.get("outcome").equals("failed")).count();
        int total = testResults.size();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", total);
        summary.put("passed", passed);
        summary.put("failed", failed);
        summary.put("errors", 0);
        summary.put("skipped", 0);

        Map<String, Object> results = new LinkedHashMap<>();
        results.put("success", exitCode == 0);
        results.put("exit_code", exitCode);
        results.put("tests", testResults);
        results.put("summary", summary);
        results.put("stdout", stdout.toString());
        results.put("stderr", "");

        System.out.println("\nResults: " + passed + " passed, " + failed + " failed (total: " + total + ")\n");
        return results;
    }

    private static Map<String, String> getEnvironmentInfo() {
        Map<String, String> env = new LinkedHashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("platform", System.getProperty("os.name") + " " + System.getProperty("os.version"));
        env.put("os", System.getProperty("os.name"));
        env.put("os_release", System.getProperty("os.version"));
        env.put("architecture", System.getProperty("os.arch"));
        env.put("hostname", System.getenv("COMPUTERNAME") != null ? System.getenv("COMPUTERNAME") : "unknown");

        String gitCommit = "unknown";
        String gitBranch = "unknown";
        try {
            gitCommit = executeCommandWithOutput(Arrays.asList("git", "rev-parse", "HEAD")).substring(0, 8);
            gitBranch = executeCommandWithOutput(Arrays.asList("git", "rev-parse", "--abbrev-ref", "HEAD")).trim();
        } catch (Exception e) {
        }

        env.put("git_commit", gitCommit);
        env.put("git_branch", gitBranch);
        return env;
    }

    private static void executeCommand(List<String> cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        Process p = pb.start();
        if (p.waitFor() != 0) {
            throw new RuntimeException("Command failed: " + cmd);
        }
    }

    private static String executeCommandWithOutput(List<String> cmd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        Process p = pb.start();
        BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
        String firstLine = reader.readLine();
        p.waitFor();
        return firstLine != null ? firstLine : "unknown";
    }

    private static void saveReport(Map<String, Object> report) throws Exception {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd/HH-mm-ss");
        String pathPrefix = "evaluation/" + dtf.format(LocalDateTime.now());
        Files.createDirectories(Paths.get(pathPrefix));
        Path reportPath = Paths.get(pathPrefix + "/report.json");

        String json = toJson(report, 0);
        Files.writeString(reportPath, json);
        System.out.println("✅ Report saved to: " + reportPath);

        // Also save to standard location for simplicity
        Files.writeString(Paths.get("evaluation/report.json"), json);
    }

    private static String toJson(Object obj, int indent) {
        StringBuilder sb = new StringBuilder();
        String pad = "  ".repeat(indent);
        if (obj instanceof Map) {
            sb.append("{\n");
            Map<?, ?> map = (Map<?, ?>) obj;
            int count = 0;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                sb.append(pad).append("  \"").append(entry.getKey()).append("\": ")
                        .append(toJson(entry.getValue(), indent + 1));
                if (++count < map.size())
                    sb.append(",");
                sb.append("\n");
            }
            sb.append(pad).append("}");
        } else if (obj instanceof List) {
            sb.append("[\n");
            List<?> list = (List<?>) obj;
            for (int i = 0; i < list.size(); i++) {
                sb.append(pad).append("  ").append(toJson(list.get(i), indent + 1));
                if (i < list.size() - 1)
                    sb.append(",");
                sb.append("\n");
            }
            sb.append(pad).append("]");
        } else if (obj instanceof String) {
            sb.append("\"").append(((String) obj).replace("\"", "\\\"").replace("\n", "\\n").replace("\r", ""))
                    .append("\"");
        } else {
            sb.append(obj);
        }
        return sb.toString();
    }
}
