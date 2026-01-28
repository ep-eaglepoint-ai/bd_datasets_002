import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public class Evaluation {


    private static final Path JAVA_PACKAGE_PATH = Paths.get("src/main/java/com/example/sensormetrics");
    @SuppressWarnings("unused")
    private static final String CONTROLLER_FILE = "SensorMetricsController.java";

    private static final int STDOUT_TAIL_LIMIT = 3000;
    private static final int STDERR_TAIL_LIMIT = 1000;
    private static final long MVN_TEST_TIMEOUT_MILLIS = 120_000;

    private static String generateRunId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }

    private static Map<String, Object> getEnvironmentInfo() {
        Map<String, Object> env = new LinkedHashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("platform", System.getProperty("os.name") + " " + System.getProperty("os.version") + " " + System.getProperty("os.arch"));
        env.put("java_version", firstLineOrEmpty(runCommandCaptureAll(List.of("java", "-version"), 10_000).stderr));
        env.put("maven_version", firstLineOrEmpty(runCommandCaptureAll(List.of("mvn", "-version"), 10_000).stdout));
        return env;
    }

    private static Path generateOutputPath() {
        LocalDateTime now = LocalDateTime.now();
        String dateStr = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ROOT));
        String timeStr = now.format(DateTimeFormatter.ofPattern("HH-mm-ss", Locale.ROOT));
        return Paths.get("evaluation").resolve(dateStr).resolve(timeStr).resolve("report.json");
    }

    private static Map<String, Object> parseMavenOutput(String output) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", 0);
        summary.put("passed", 0);
        summary.put("failed", 0);
        summary.put("errors", 0);
        summary.put("skipped", 0);

        Pattern p = Pattern.compile("Tests run: (\\d+), Failures: (\\d+), Errors: (\\d+), Skipped: (\\d+)");
        Matcher m = p.matcher(output == null ? "" : output);
        if (m.find()) {
            int total = Integer.parseInt(m.group(1));
            int failures = Integer.parseInt(m.group(2));
            int errors = Integer.parseInt(m.group(3));
            int skipped = Integer.parseInt(m.group(4));
            summary.clear();
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
        System.out.println("RUNNING TESTS: " + label.toUpperCase(Locale.ROOT));
        System.out.println("=".repeat(60));

        Path sourceDir = Paths.get(sourceRepoPath);
        if (!Files.exists(sourceDir)) {
            return Map.of(
                    "success", false,
                    "summary", Map.of("error", "Source directory not found: " + sourceDir)
            );
        }

        List<Path> javaFiles = new ArrayList<>();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(sourceDir, "*.java")) {
            for (Path p : ds) javaFiles.add(p);
        } catch (IOException e) {
            return Map.of(
                    "success", false,
                    "summary", Map.of("error", e.toString())
            );
        }

        if (javaFiles.isEmpty()) {
            return Map.of(
                    "success", false,
                    "summary", Map.of("error", "No .java files found in: " + sourceDir)
            );
        }

        // Ensure package directory exists
        try {
            Files.createDirectories(JAVA_PACKAGE_PATH);
        } catch (IOException e) {
            return Map.of(
                    "success", false,
                    "summary", Map.of("error", e.toString())
            );
        }

        // Clean up existing .java files (except SensorMetricsTestApplication.java which is mounted from tests/)
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(JAVA_PACKAGE_PATH, "*.java")) {
            for (Path existing : ds) {
                if (!"SensorMetricsTestApplication.java".equals(existing.getFileName().toString())) {
                    Files.deleteIfExists(existing);
                }
            }
        } catch (IOException e) {
            return Map.of(
                    "success", false,
                    "summary", Map.of("error", e.toString())
            );
        }

        for (Path sourceFile : javaFiles) {
            if ("SensorMetricsTestApplication.java".equals(sourceFile.getFileName().toString())) {
                continue;
            }
            Path destFile = JAVA_PACKAGE_PATH.resolve(sourceFile.getFileName().toString());
            System.out.println("Copying " + sourceFile + " -> " + destFile);
            try {
                Files.copy(sourceFile, destFile);
            } catch (IOException e) {
                return Map.of(
                        "success", false,
                        "summary", Map.of("error", e.toString())
                );
            }
        }

        List<String> cmd = List.of("mvn", "test", "-Dtest=SensorMetricsControllerTest");
        try {
            ExecResult result = runCommandCaptureAll(cmd, MVN_TEST_TIMEOUT_MILLIS);
            Map<String, Object> summary = parseMavenOutput(result.stdout);
            boolean success = (result.exitCode == 0);

            System.out.println("Result: " + (success ? "✅ SUCCESS" : "❌ FAILURE"));

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("success", success);
            out.put("exit_code", result.exitCode);
            out.put("summary", summary);
            out.put("stdout", tail(result.stdout, STDOUT_TAIL_LIMIT));
            out.put("stderr", tail(result.stderr, STDERR_TAIL_LIMIT));
            return out;
        } catch (Exception e) {
            System.out.println("❌ Error: " + e);
            return Map.of(
                    "success", false,
                    "summary", Map.of("error", e.toString())
            );
        }
    }

    private static Map<String, Object> runEvaluation() {
        // Ensure Java Package Structure Exists
        try {
            Files.createDirectories(JAVA_PACKAGE_PATH);
        } catch (IOException e) {
            return Map.of(
                    "before", Map.of("success", false, "summary", Map.of("error", e.toString())),
                    "after", Map.of("success", false, "summary", Map.of("error", e.toString())),
                    "comparison", Map.of("before_passed", false, "after_passed", false)
            );
        }

        Map<String, Object> beforeResults = runMavenTest("repository_before", "before (repository_before)");
        Map<String, Object> afterResults = runMavenTest("repository_after", "after (repository_after)");

        boolean beforePassed = Boolean.TRUE.equals(beforeResults.get("success"));
        boolean afterPassed = Boolean.TRUE.equals(afterResults.get("success"));

        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("before_passed", beforePassed);
        comparison.put("after_passed", afterPassed);

        Map<String, Object> results = new LinkedHashMap<>();
        results.put("before", beforeResults);
        results.put("after", afterResults);
        results.put("comparison", comparison);
        return results;
    }

    public static void main(String[] args) throws Exception {
        String runId = generateRunId();
        LocalDateTime startedAt = LocalDateTime.now();

        Map<String, Object> results = runEvaluation();

        LocalDateTime finishedAt = LocalDateTime.now();
        double durationSeconds = java.time.Duration.between(startedAt, finishedAt).toMillis() / 1000.0;

        // Success if After passes
        @SuppressWarnings("unchecked")
        Map<String, Object> after = (Map<String, Object>) results.get("after");
        boolean overallSuccess = after != null && Boolean.TRUE.equals(after.get("success"));

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("run_id", runId);
        report.put("started_at", startedAt.toString());
        report.put("finished_at", finishedAt.toString());
        report.put("duration_seconds", Math.round(durationSeconds * 100.0) / 100.0);
        report.put("success", overallSuccess);
        report.put("environment", getEnvironmentInfo());
        report.put("results", results);

        Path outputPath = generateOutputPath();
        Files.createDirectories(outputPath.getParent());
        Files.writeString(outputPath, Json.toJson(report), StandardCharsets.UTF_8);

        System.out.println("\n✅ Report saved to: " + outputPath);
        System.exit(overallSuccess ? 0 : 1);
    }

    // -------------------- helpers --------------------

    private static String firstLineOrEmpty(String s) {
        if (s == null || s.isEmpty()) return "";
        int idx = s.indexOf('\n');
        return (idx >= 0) ? s.substring(0, idx).trim() : s.trim();
    }

    private static String tail(String s, int maxChars) {
        if (s == null) return "";
        if (s.length() <= maxChars) return s;
        return s.substring(s.length() - maxChars);
    }

    private record ExecResult(int exitCode, String stdout, String stderr) {}

    private static ExecResult runCommandCaptureAll(List<String> cmd, long timeoutMillis) {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.redirectErrorStream(false);
        try {
            Process p = pb.start();

            ByteArrayOutputStream stdoutBuf = new ByteArrayOutputStream();
            ByteArrayOutputStream stderrBuf = new ByteArrayOutputStream();

            Thread tOut = new Thread(() -> copyAll(p.getInputStream(), stdoutBuf), "stdout-reader");
            Thread tErr = new Thread(() -> copyAll(p.getErrorStream(), stderrBuf), "stderr-reader");
            tOut.start();
            tErr.start();

            boolean finished = p.waitFor(timeoutMillis, java.util.concurrent.TimeUnit.MILLISECONDS);
            if (!finished) {
                p.destroyForcibly();
                throw new RuntimeException("Command timed out after " + timeoutMillis + "ms: " + String.join(" ", cmd));
            }

            tOut.join(5_000);
            tErr.join(5_000);

            int exit = p.exitValue();
            String stdout = stdoutBuf.toString(StandardCharsets.UTF_8);
            String stderr = stderrBuf.toString(StandardCharsets.UTF_8);
            return new ExecResult(exit, stdout, stderr);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void copyAll(InputStream in, ByteArrayOutputStream out) {
        try (in; out) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) >= 0) {
                out.write(buf, 0, n);
            }
        } catch (IOException ignored) {
            // best-effort
        }
    }

    /**
     * Minimal JSON serializer for Maps/Lists/Strings/Numbers/Booleans/null.
     * Uses LinkedHashMap insertion order for stable output.
     */
    private static final class Json {
        static String toJson(Object v) {
            StringBuilder sb = new StringBuilder();
            writeValue(sb, v);
            return sb.toString();
        }

        @SuppressWarnings("unchecked")
        private static void writeValue(StringBuilder sb, Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof String s) {
                sb.append('"').append(escape(s)).append('"');
            } else if (v instanceof Number || v instanceof Boolean) {
                sb.append(v.toString());
            } else if (v instanceof Map<?, ?> m) {
                sb.append('{');
                boolean first = true;
                for (Map.Entry<?, ?> e : m.entrySet()) {
                    if (!first) sb.append(',');
                    first = false;
                    sb.append('"').append(escape(String.valueOf(e.getKey()))).append('"').append(':');
                    writeValue(sb, e.getValue());
                }
                sb.append('}');
            } else if (v instanceof List<?> list) {
                sb.append('[');
                for (int i = 0; i < list.size(); i++) {
                    if (i > 0) sb.append(',');
                    writeValue(sb, list.get(i));
                }
                sb.append(']');
            } else {
                // Fallback: serialize as string
                sb.append('"').append(escape(String.valueOf(v))).append('"');
            }
        }

        private static String escape(String s) {
            StringBuilder out = new StringBuilder(s.length() + 16);
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"' -> out.append("\\\"");
                    case '\\' -> out.append("\\\\");
                    case '\b' -> out.append("\\b");
                    case '\f' -> out.append("\\f");
                    case '\n' -> out.append("\\n");
                    case '\r' -> out.append("\\r");
                    case '\t' -> out.append("\\t");
                    default -> {
                        if (c < 0x20) {
                            out.append(String.format(Locale.ROOT, "\\u%04x", (int) c));
                        } else {
                            out.append(c);
                        }
                    }
                }
            }
            return out.toString();
        }
    }
}


