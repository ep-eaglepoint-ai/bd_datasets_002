package evaluation;

import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.time.format.*;
import java.util.*;

public class Evaluation {

    private static final Path ROOT = Paths.get("/app");
    private static final Path REPORTS = ROOT.resolve("evaluation").resolve("reports");

    public static void main(String[] args) {
        Map<String, Object> result = runEvaluation();
        String report = toJson(result);
        System.out.println(report);
        boolean success = (boolean) result.get("success");
        System.exit(success ? 0 : 1);
    }

    static Map<String, Object> environmentInfo() {
        Map<String, Object> env = new LinkedHashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("platform", System.getProperty("os.name") + "-" + System.getProperty("os.arch"));
        return env;
    }

    static Map<String, Object> runTests(Path repoPath) {
        Map<String, Object> result = new LinkedHashMap<>();
        Path src = repoPath.resolve("src");

        if (!Files.exists(src)) {
            result.put("passed", false);
            result.put("return_code", -1);
            result.put("output", "Source directory not found");
            return result;
        }

        try {
            boolean hasJavaFiles = Files.walk(src).anyMatch(p -> p.toString().endsWith(".java"));
            if (!hasJavaFiles) {
                result.put("passed", false);
                result.put("return_code", -1);
                result.put("output", "Empty repository");
                return result;
            }
        } catch (IOException e) {
            result.put("passed", false);
            result.put("return_code", -1);
            result.put("output", "Error scanning sources: " + e.getMessage());
            return result;
        }

        Path classesDir = null;
        try {
            classesDir = Files.createTempDirectory("classes");

            List<String> javaFiles = new ArrayList<>();
            Files.walk(src).filter(p -> p.toString().endsWith(".java")).forEach(p -> javaFiles.add(p.toString()));

            List<String> compileCmd = new ArrayList<>(List.of("javac", "-d", classesDir.toString()));
            compileCmd.addAll(javaFiles);
            int compileResult = runCommand(compileCmd, null);
            if (compileResult != 0) {
                result.put("passed", false);
                result.put("return_code", 1);
                result.put("output", "Compilation failed");
                return result;
            }

            Path testFile = ROOT.resolve("tests").resolve("BoundedCacheTest.java");
            int testCompile = runCommand(
                    List.of("javac", "-cp", classesDir.toString(), "-d", classesDir.toString(), testFile.toString()),
                    null);
            if (testCompile != 0) {
                result.put("passed", false);
                result.put("return_code", 1);
                result.put("output", "Test compilation failed");
                return result;
            }

            ProcessBuilder pb = new ProcessBuilder("java", "-cp", classesDir.toString(),
                    "com.example.cache.BoundedCacheTest");
            pb.redirectErrorStream(true);
            Process p = pb.start();

            boolean finished = p.waitFor(120, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                p.destroyForcibly();
                result.put("passed", false);
                result.put("return_code", -1);
                result.put("output", "Test timeout");
                return result;
            }

            String output = new String(p.getInputStream().readAllBytes());
            int code = p.exitValue();

            result.put("passed", code == 0);
            result.put("return_code", code);
            String truncatedOutput = output.length() > 8000 ? output.substring(output.length() - 8000) : output;
            result.put("output", truncatedOutput);

        } catch (Exception e) {
            result.put("passed", false);
            result.put("return_code", -1);
            result.put("output", "Exception: " + e.getMessage());
        } finally {
            if (classesDir != null) {
                try {
                    Files.walk(classesDir).sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
                } catch (IOException ignored) {
                }
            }
        }

        return result;
    }

    static Map<String, Object> runMetrics(Path repoPath) {
        return new LinkedHashMap<>();
    }

    static Map<String, Object> evaluate(String repoName) {
        Path repoPath = ROOT.resolve(repoName);
        Map<String, Object> tests = runTests(repoPath);
        Map<String, Object> metrics = runMetrics(repoPath);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("tests", tests);
        result.put("metrics", metrics);
        return result;
    }

    static Map<String, Object> runEvaluation() {
        String runId = UUID.randomUUID().toString();
        Instant start = Instant.now();

        Map<String, Object> before = evaluate("repository_before");
        Map<String, Object> after = evaluate("repository_after");

        Instant end = Instant.now();

        boolean afterPassed = (boolean) ((Map<?, ?>) after.get("tests")).get("passed");

        Map<String, Object> comparison = new LinkedHashMap<>();
        comparison.put("passed_gate", afterPassed);
        comparison.put("improvement_summary", "After implementation passed correctness checks");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("run_id", runId);
        result.put("started_at", start.toString() + "Z");
        result.put("finished_at", end.toString() + "Z");
        result.put("duration_seconds", Duration.between(start, end).toMillis() / 1000.0);
        result.put("environment", environmentInfo());
        result.put("before", before);
        result.put("after", after);
        result.put("comparison", comparison);
        result.put("success", afterPassed);
        result.put("error", null);

        writeReport(result);

        return result;
    }

    static void writeReport(Map<String, Object> result) {
        try {
            String date = LocalDate.now().toString();
            String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH-mm-ss"));
            Path reportDir = REPORTS.resolve(date).resolve(time);
            Files.createDirectories(reportDir);
            Files.writeString(reportDir.resolve("report.json"), toJson(result));
            System.out.println("Report: " + reportDir.resolve("report.json"));
        } catch (IOException e) {
            System.err.println("Failed to write report: " + e.getMessage());
        }
    }

    static int runCommand(List<String> cmd, Path cwd) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        if (cwd != null)
            pb.directory(cwd.toFile());
        pb.inheritIO();
        return pb.start().waitFor();
    }

    static String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{\n");
        boolean first = true;
        for (var e : map.entrySet()) {
            if (!first)
                sb.append(",\n");
            first = false;
            sb.append("  \"").append(e.getKey()).append("\": ");
            sb.append(valueToJson(e.getValue(), 2));
        }
        sb.append("\n}");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    static String valueToJson(Object v, int indent) {
        if (v == null) {
            return "null";
        } else if (v instanceof Map) {
            Map<String, Object> m = (Map<String, Object>) v;
            if (m.isEmpty())
                return "{}";
            StringBuilder sb = new StringBuilder("{\n");
            String pad = "  ".repeat(indent + 1);
            boolean first = true;
            for (var e : m.entrySet()) {
                if (!first)
                    sb.append(",\n");
                first = false;
                sb.append(pad).append("\"").append(e.getKey()).append("\": ");
                sb.append(valueToJson(e.getValue(), indent + 1));
            }
            sb.append("\n").append("  ".repeat(indent)).append("}");
            return sb.toString();
        } else if (v instanceof String) {
            return "\""
                    + ((String) v).replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r")
                    + "\"";
        } else if (v instanceof Boolean || v instanceof Number) {
            return v.toString();
        } else {
            return "\"" + v.toString() + "\"";
        }
    }
}
