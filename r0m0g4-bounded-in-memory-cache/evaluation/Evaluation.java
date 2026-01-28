package evaluation;

import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.time.format.*;
import java.util.*;

public class Evaluation {

    public static void main(String[] args) throws Exception {
        String runId = UUID.randomUUID().toString();
        Instant startedAt = Instant.now();

        System.out.println("=== Evaluation Started ===");
        System.out.println("Run ID: " + runId);

        // Run tests on before/after
        Map<String, Object> before = runTests("/app/repository_before", "before");
        Map<String, Object> after = runTests("/app/repository_after", "after");

        Instant finishedAt = Instant.now();
        double duration = Duration.between(startedAt, finishedAt).toMillis() / 1000.0;

        // Compare results
        boolean beforePassed = (boolean) ((Map<?, ?>) before.get("tests")).get("passed");
        boolean afterPassed = (boolean) ((Map<?, ?>) after.get("tests")).get("passed");
        boolean passedGate = afterPassed;
        String summary = beforePassed ? (afterPassed ? "All tests passing" : "Regression detected")
                : (afterPassed ? "New implementation: tests now passing" : "Tests still failing");

        // Build report JSON
        String report = String.format("""
                {
                  "run_id": "%s",
                  "started_at": "%s",
                  "finished_at": "%s",
                  "duration_seconds": %.2f,
                  "environment": {"java_version": "%s", "platform": "%s"},
                  "before": %s,
                  "after": %s,
                  "comparison": {"passed_gate": %s, "improvement_summary": "%s"},
                  "success": %s,
                  "error": null
                }""",
                runId, startedAt, finishedAt, duration,
                System.getProperty("java.version"), System.getProperty("os.name") + "-" + System.getProperty("os.arch"),
                toJson(before), toJson(after),
                passedGate, summary, passedGate);

        // Write report
        String date = LocalDate.now().toString();
        String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH-mm-ss"));
        Path reportDir = Paths.get("/app/evaluation/reports", date, time);
        Files.createDirectories(reportDir);
        Files.writeString(reportDir.resolve("report.json"), report);

        System.out.println("Report: " + reportDir.resolve("report.json"));
        System.out.println(report);
        System.exit(passedGate ? 0 : 1);
    }

    static Map<String, Object> runTests(String repoPath, String name) throws Exception {
        Path src = Paths.get(repoPath, "src");
        Map<String, Object> result = new HashMap<>();
        Map<String, Object> tests = new HashMap<>();

        // Check if repo has sources
        if (!Files.exists(src) || Files.walk(src).noneMatch(p -> p.toString().endsWith(".java"))) {
            tests.put("passed", false);
            tests.put("return_code", -1);
            tests.put("output", "Empty repository");
            result.put("tests", tests);
            result.put("metrics", Map.of());
            return result;
        }

        Path classesDir = Files.createTempDirectory("classes_" + name);
        try {
            // Compile sources
            List<String> javaFiles = new ArrayList<>();
            Files.walk(src).filter(p -> p.toString().endsWith(".java")).forEach(p -> javaFiles.add(p.toString()));

            List<String> compileCmd = new ArrayList<>(List.of("javac", "-d", classesDir.toString()));
            compileCmd.addAll(javaFiles);
            if (run(compileCmd) != 0) {
                tests.put("passed", false);
                tests.put("return_code", 1);
                tests.put("output", "Compilation failed");
                result.put("tests", tests);
                result.put("metrics", Map.of());
                return result;
            }

            // Compile tests
            if (run(List.of("javac", "-cp", classesDir.toString(), "-d", classesDir.toString(),
                    "/app/tests/BoundedCacheTest.java")) != 0) {
                tests.put("passed", false);
                tests.put("return_code", 1);
                tests.put("output", "Test compilation failed");
                result.put("tests", tests);
                result.put("metrics", Map.of());
                return result;
            }

            // Run tests
            long start = System.currentTimeMillis();
            ProcessBuilder pb = new ProcessBuilder("java", "-cp", classesDir.toString(),
                    "com.example.cache.BoundedCacheTest");
            pb.redirectErrorStream(true);
            Process p = pb.start();
            String output = new String(p.getInputStream().readAllBytes());
            int code = p.waitFor();
            long elapsed = System.currentTimeMillis() - start;

            tests.put("passed", code == 0);
            tests.put("return_code", code);
            tests.put("output", output.length() > 500 ? output.substring(output.length() - 500) : output);
            result.put("tests", tests);
            result.put("metrics", Map.of("avg_time_ms", elapsed, "failures", code == 0 ? 0 : 1));

        } finally {
            // Cleanup
            Files.walk(classesDir).sorted(Comparator.reverseOrder()).map(Path::toFile).forEach(File::delete);
        }
        return result;
    }

    static int run(List<String> cmd) throws Exception {
        return new ProcessBuilder(cmd).inheritIO().start().waitFor();
    }

    static String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (var e : map.entrySet()) {
            if (!first)
                sb.append(", ");
            first = false;
            sb.append("\"").append(e.getKey()).append("\": ");
            Object v = e.getValue();
            if (v instanceof Map)
                sb.append(toJson((Map<String, Object>) v));
            else if (v instanceof String)
                sb.append("\"").append(((String) v).replace("\"", "\\\"").replace("\n", "\\n")).append("\"");
            else
                sb.append(v);
        }
        return sb.append("}").toString();
    }
}
