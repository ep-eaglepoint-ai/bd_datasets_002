import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

public class evaluation {

    private static final Path ROOT = Paths.get(System.getProperty("user.dir"));
    private static final Path REPORTS = ROOT.resolve("evaluation").resolve("reports");

    public static void main(String[] args) {
        System.exit(main());
    }

    public static int main() {
        try {
            REPORTS.toFile().mkdirs();
            Map<String, Object> report = runEvaluation();
            Path path = REPORTS.resolve("latest.json");
            Files.write(path, SimpleJson.toJson(report).getBytes());
            System.out.println("Report written to " + path);
            return (Boolean) report.get("success") ? 0 : 1;
        } catch (Exception e) {
            e.printStackTrace();
            return 1;
        }
    }

    public static Map<String, Object> runEvaluation() {
        String runId = UUID.randomUUID().toString();
        Instant start = Instant.now();
        Map<String, Object> before = evaluate("repository_before");
        Map<String, Object> after = evaluate("repository_after");
        Map<String, Object> comparison = Map.of(
            "passed_gate", after.get("tests") instanceof Map && (Boolean) ((Map) after.get("tests")).get("passed"),
            "improvement_summary", "After implementation passed correctness tests"
        );
        Instant end = Instant.now();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("run_id", runId);
        result.put("started_at", start.toString());
        result.put("finished_at", end.toString());
        result.put("duration_seconds", Duration.between(start, end).toMillis() / 1000.0);
        result.put("environment", environmentInfo());
        result.put("before", before);
        result.put("after", after);
        result.put("comparison", comparison);
        result.put("success", comparison.get("passed_gate"));
        result.put("error", null);
        return result;
    }

    public static Map<String, Object> evaluate(String repoName) {
        Map<String, Object> tests = runTests(repoName);
        Map<String, Object> metrics = runMetrics(ROOT.resolve(repoName));
        return Map.of(
            "tests", tests,
            "metrics", metrics
        );
    }

    public static Map<String, Object> runTests(String repoName) {
        try {
            // Copy the appropriate controller
            Path srcDir = ROOT.resolve("src").resolve("main").resolve("java").resolve("com").resolve("eaglepoint").resolve("chat");
            if (repoName.equals("repository_before")) {
                Files.copy(ROOT.resolve("repository_before").resolve("ChatAnalyticsController.java"), srcDir.resolve("ChatAnalyticsController.java"), StandardCopyOption.REPLACE_EXISTING);
            } else {
                Files.copy(ROOT.resolve("repository_after").resolve("src").resolve("main").resolve("java").resolve("com").resolve("eaglepoint").resolve("chat").resolve("ChatAnalyticsController.java"), srcDir.resolve("ChatAnalyticsController.java"), StandardCopyOption.REPLACE_EXISTING);
            }
            ProcessBuilder pb = new ProcessBuilder("mvn", "test");
            pb.directory(ROOT.toFile());
            pb.redirectOutput(ProcessBuilder.Redirect.PIPE);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            boolean finished = p.waitFor(120, TimeUnit.SECONDS);
            if (!finished) {
                p.destroyForcibly();
                return Map.of(
                    "passed", false,
                    "return_code", -1,
                    "output", "mvn test timeout"
                );
            }
            boolean passed = p.exitValue() == 0;
            return Map.of(
                "passed", passed,
                "return_code", p.exitValue(),
                "output", "Tests " + (passed ? "passed" : "failed")
            );
        } catch (Exception e) {
            return Map.of(
                "passed", false,
                "return_code", -1,
                "output", "Exception: " + e.getMessage()
            );
        }
    }

    public static Map<String, Object> runMetrics(Path repoPath) {
        // Optional – implement if needed
        return Map.of();
    }

    public static Map<String, Object> environmentInfo() {
        return Map.of(
            "java_version", System.getProperty("java.version"),
            "platform", System.getProperty("os.name") + "-" + System.getProperty("os.arch")
        );
    }
}

class SimpleJson {
    private static int indentLevel = 0;

    public static String toJson(Object obj) {
        return toJson(obj, 0);
    }

    private static String toJson(Object obj, int level) {
        if (obj instanceof Map) {
            Map<?, ?> map = (Map<?, ?>) obj;
            if (map.isEmpty()) return "{}";
            StringBuilder sb = new StringBuilder("{\n");
            boolean first = true;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (!first) sb.append(",\n");
                sb.append("  ".repeat(level + 1)).append("\"").append(entry.getKey()).append("\": ");
                sb.append(toJson(entry.getValue(), level + 1));
                first = false;
            }
            sb.append("\n").append("  ".repeat(level)).append("}");
            return sb.toString();
        } else if (obj instanceof String) {
            return "\"" + ((String) obj).replace("\"", "\\\"").replace("\n", "\\n") + "\"";
        } else if (obj instanceof Number || obj instanceof Boolean) {
            return obj.toString();
        } else if (obj == null) {
            return "null";
        } else {
            return "\"" + obj.toString() + "\"";
        }
    }
}