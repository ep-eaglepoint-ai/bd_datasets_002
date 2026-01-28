import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class EvaluationMain {

    static class CmdResult {
        int exitCode;
        String output;
        CmdResult(int c, String o) { exitCode = c; output = o; }
    }

    public static void main(String[] args) throws Exception {
        Instant started = Instant.now();
        String runId = UUID.randomUUID().toString();

        // run before checks
        CmdResult before = runCommand(new String[]{"sh","-c","chmod +x tests/run_before.sh && sh tests/run_before.sh"});

        // run after checks (Maven). This may take time.
        CmdResult after = runCommand(new String[]{"bash","-lc","chmod +x tests/run_after.sh && tests/run_after.sh"});

        Instant finished = Instant.now();

        Map<String,Object> report = new HashMap<>();
        report.put("run_id", runId);
        report.put("started_at", DateTimeFormatter.ISO_INSTANT.format(started));
        report.put("finished_at", DateTimeFormatter.ISO_INSTANT.format(finished));
        double duration = (finished.toEpochMilli() - started.toEpochMilli())/1000.0;
        report.put("duration_seconds", duration);

        boolean success = before.exitCode == 0 && after.exitCode == 0;
        report.put("success", success);
        report.put("error", null);

        Map<String,Object> env = new HashMap<>();
        env.put("java_version", System.getProperty("java.version"));
        env.put("platform", System.getProperty("os.name"));
        env.put("os", System.getProperty("os.name") + "-" + System.getProperty("os.version"));
        env.put("architecture", System.getProperty("os.arch"));
        try { env.put("hostname", InetAddress.getLocalHost().getHostName()); } catch(Exception e){ env.put("hostname","unknown"); }
        report.put("environment", env);

        Map<String,Object> results = new HashMap<>();
        results.put("before", buildResultFromBefore(before));
        results.put("after", buildResultFromAfter(after));

        // comparison
        Map<String,Object> comparison = new HashMap<>();
        Map<String,Object> bsum = (Map<String,Object>)((Map<String,Object>)results.get("before")).get("summary");
        Map<String,Object> asum = (Map<String,Object>)((Map<String,Object>)results.get("after")).get("summary");
        comparison.put("before_tests_passed", ((Number)bsum.get("passed")).intValue() == ((Number)bsum.get("total")).intValue());
        comparison.put("after_tests_passed", ((Number)asum.get("passed")).intValue() == ((Number)asum.get("total")).intValue());
        comparison.put("before_total", bsum.get("total"));
        comparison.put("before_passed", bsum.get("passed"));
        comparison.put("before_failed", bsum.get("failed"));
        comparison.put("before_xfailed", bsum.get("xfailed"));
        comparison.put("before_skipped", bsum.get("skipped"));
        comparison.put("before_errors", bsum.get("errors"));
        comparison.put("after_total", asum.get("total"));
        comparison.put("after_passed", asum.get("passed"));
        comparison.put("after_failed", asum.get("failed"));
        comparison.put("after_xfailed", asum.get("xfailed"));
        comparison.put("after_skipped", asum.get("skipped"));
        comparison.put("after_errors", asum.get("errors"));
        Map<String,Object> improvement = new HashMap<>();
        int beforeFixed = ((Number)bsum.get("failed")).intValue() - ((Number)asum.get("failed")).intValue();
        improvement.put("tests_fixed", Math.max(0, beforeFixed));
        improvement.put("features_added", Math.max(0, ((Number)asum.get("passed")).intValue() - ((Number)bsum.get("passed")).intValue()));
        comparison.put("improvement", improvement);

        results.put("comparison", comparison);

        report.put("results", results);

        // write to evaluation/yyyy-mm-dd/hh-mm-ss/report.json
        Instant now = Instant.now();
        String date = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC).format(now);
        String time = DateTimeFormatter.ofPattern("HH-mm-ss").withZone(ZoneOffset.UTC).format(now);
        Path dir = Path.of("evaluation", date, time);
        Files.createDirectories(dir);
        Path out = dir.resolve("report.json");
        String json = toPrettyJson(report);
        Files.write(out, json.getBytes(StandardCharsets.UTF_8));

        System.out.println("Wrote report to " + out.toString());
        // also print summary to stdout
        System.out.println(json);
        if (!success) {
            System.exit(1);
        }
    }

    static Map<String,Object> buildResultFromBefore(CmdResult r) {
        Map<String,Object> res = new HashMap<>();
        res.put("success", r.exitCode == 0);
        res.put("exit_code", r.exitCode);
        List<Map<String,Object>> tests = new ArrayList<>();
        int passed=0, failed=0;
        String[] lines = r.output.split("\\r?\\n");
        for (String l : lines) {
            l = l.trim();
            if (l.startsWith("[PASS] ")) {
                String name = l.substring(7);
                Map<String,Object> t = Map.of("class","Static Checks","name",name,"status","passed","full_name", "Static Checks::"+name);
                tests.add(t); passed++;
            } else if (l.startsWith("[FAIL] ")) {
                String name = l.substring(7);
                Map<String,Object> t = Map.of("class","Static Checks","name",name,"status","failed","full_name", "Static Checks::"+name);
                tests.add(t); failed++;
            }
        }
        Map<String,Object> summary = new HashMap<>();
        summary.put("total", tests.size());
        summary.put("passed", passed);
        summary.put("failed", failed);
        summary.put("xfailed", 0);
        summary.put("errors", 0);
        summary.put("skipped", 0);
        res.put("tests", tests);
        res.put("summary", summary);
        return res;
    }

    static Map<String,Object> buildResultFromAfter(CmdResult r) {
        Map<String,Object> res = new HashMap<>();
        res.put("success", r.exitCode == 0);
        res.put("exit_code", r.exitCode);
        List<Map<String,Object>> tests = new ArrayList<>();
        int passed=0, failed=0;
        String[] lines = r.output.split("\\r?\\n");
        for (String l : lines) {
            l = l.trim();
            if (l.startsWith("[PASS] ")) {
                // format: [PASS] testName (class)
                int p = l.indexOf('(');
                String name = (p>0)? l.substring(7,p).trim() : l.substring(7).trim();
                String cls = (p>0)? l.substring(p+1, l.length()-1).trim() : "unknown";
                Map<String,Object> t = Map.of("class",cls,"name",name,"status","passed","full_name", cls+"::"+name);
                tests.add(t); passed++;
            } else if (l.startsWith("[FAIL] ")) {
                int p = l.indexOf('(');
                String name = (p>0)? l.substring(7,p).trim() : l.substring(7).trim();
                String cls = (p>0)? l.substring(p+1, l.length()-1).trim() : "unknown";
                Map<String,Object> t = Map.of("class",cls,"name",name,"status","failed","full_name", cls+"::"+name);
                tests.add(t); failed++;
            }
        }
        Map<String,Object> summary = new HashMap<>();
        summary.put("total", tests.size());
        summary.put("passed", passed);
        summary.put("failed", failed);
        summary.put("xfailed", 0);
        summary.put("errors", 0);
        summary.put("skipped", 0);
        res.put("tests", tests);
        res.put("summary", summary);
        return res;
    }

    static CmdResult runCommand(String[] cmd) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(cmd);
        pb.directory(new File(System.getProperty("user.dir")));
        pb.redirectErrorStream(true);
        Process p = pb.start();
        StringBuilder out = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
            String line;
            while ((line = r.readLine()) != null) {
                out.append(line).append("\n");
            }
        }
        int code = p.waitFor();
        return new CmdResult(code, out.toString());
    }

    static String toPrettyJson(Object obj) {
        // very small custom serializer for our known structures
        if (obj instanceof Map) return mapToJson((Map<?,?>)obj, 0);
        return "null";
    }

    static String indent(int n) { return "  ".repeat(Math.max(0,n)); }

    static String mapToJson(Map<?,?> m, int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        boolean first = true;
        for (Map.Entry<?,?> e : m.entrySet()) {
            if (!first) sb.append(",\n");
            sb.append("\n").append(indent(level+1)).append(quote(e.getKey().toString())).append(": ");
            sb.append(valueToJson(e.getValue(), level+1));
            first = false;
        }
        sb.append("\n").append(indent(level)).append("}");
        return sb.toString();
    }

    static String listToJson(List<?> list, int level) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        boolean first = true;
        for (Object o : list) {
            if (!first) sb.append(",\n");
            sb.append("\n").append(indent(level+1)).append(valueToJson(o, level+1));
            first = false;
        }
        sb.append("\n").append(indent(level)).append("]");
        return sb.toString();
    }

    static String valueToJson(Object v, int level) {
        if (v == null) return "null";
        if (v instanceof String) return quote((String)v);
        if (v instanceof Number) return v.toString();
        if (v instanceof Boolean) return v.toString();
        if (v instanceof Map) return mapToJson((Map<?,?>)v, level);
        if (v instanceof List) return listToJson((List<?>)v, level);
        return quote(v.toString());
    }

    static String quote(String s) {
        return '"' + s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n") + '"';
    }
}
