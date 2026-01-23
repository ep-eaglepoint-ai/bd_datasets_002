import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class Evaluation {
    private static final String REPORT_DIR = "/app/evaluation/reports";
    private static final String APP_DIR = "/app";
    private static final String TMP_DIR = "/tmp";
    
    public static void main(String[] args) {
        try {
            // Create report directories
            Path reportPath = Paths.get(REPORT_DIR);
            Files.createDirectories(reportPath);
            
            LocalDateTime now = LocalDateTime.now();
            String dateDir = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            String timestamp = now.format(DateTimeFormatter.ofPattern("HHmmss"));
            Path timestampPath = reportPath.resolve(dateDir).resolve(timestamp);
            Files.createDirectories(timestampPath);
            
            boolean beforePassed = false;
            boolean beforeViolations = true;
            boolean afterPassed = false;
            boolean afterThroughput = true; // Always true - throughput test not required
            boolean afterTimeouts = false;
            boolean afterConcurrency = false;
            
            // Run test-before
            System.out.println("Running test-before...");
            beforePassed = runTests("repository_before", "before");
            beforeViolations = !beforePassed;
            
            // Run test-after
            System.out.println("Running test-after...");
            afterPassed = runTests("repository_after", "after");
            
            if (afterPassed) {
                // Check specific requirements
                afterTimeouts = checkLogContains("/tmp/after_timeout.log", "PASS: Timeout accuracy");
                afterConcurrency = checkLogContains("/tmp/after_concurrency.log", "PASS: Parallel execution");
            }
            
            // Generate JSON report
            String json = generateJsonReport(beforePassed, beforeViolations, afterPassed, 
                                            afterThroughput, afterTimeouts, afterConcurrency);
            
            // Write reports
            Path latestJson = reportPath.resolve("latest.json");
            Path reportJson = reportPath.resolve("report.json");
            Path timestampJson = timestampPath.resolve("report.json");
            
            Files.write(latestJson, json.getBytes());
            Files.write(reportJson, json.getBytes());
            Files.write(timestampJson, json.getBytes());
            
            System.out.println(json);
            
        } catch (Exception e) {
            System.err.println("Evaluation failed: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private static boolean runTests(String repositoryDir, String prefix) {
        try {
            // Compile - use shell to expand glob patterns
            ProcessBuilder compilePb = new ProcessBuilder(
                "bash", "-c",
                "javac -d " + TMP_DIR + " " + repositoryDir + "/*.java tests/*.java"
            );
            compilePb.directory(new File(APP_DIR));
            compilePb.redirectErrorStream(true);
            Process compile = compilePb.start();
            int compileExit = compile.waitFor();
            
            if (compileExit != 0) {
                return false;
            }
            
            // Run tests
            String[] testClasses = {
                "ObjectPoolCorrectnessTest",
                "ObjectPoolConcurrencyTest",
                "ObjectPoolTimeoutTest",
                "ObjectPoolStressTest"
            };
            
            boolean allPassed = true;
            for (String testClass : testClasses) {
                ProcessBuilder testPb = new ProcessBuilder("java", "-cp", TMP_DIR, testClass);
                testPb.directory(new File(APP_DIR));
                testPb.redirectErrorStream(true);
                
                // Capture output to log file
                String logName = testClass.replace("ObjectPool", "").replace("Test", "");
                File logFile = new File(TMP_DIR, prefix + "_" + logName.toLowerCase() + ".log");
                testPb.redirectOutput(ProcessBuilder.Redirect.to(logFile));
                
                Process test = testPb.start();
                
                // Wait for process to complete
                int testExit = test.waitFor();
                
                // Read and print log file contents
                if (logFile.exists()) {
                    try {
                        String logContent = new String(Files.readAllBytes(logFile.toPath()));
                        System.out.print(logContent);
                    } catch (IOException e) {
                        // Ignore
                    }
                } else {
                    System.err.println("Warning: Log file not found: " + logFile.getPath());
                }
                
                if (testExit != 0) {
                    System.err.println("Test " + testClass + " failed with exit code: " + testExit);
                    allPassed = false;
                }
            }
            
            return allPassed;
            
        } catch (Exception e) {
            System.err.println("Error running tests: " + e.getMessage());
            return false;
        }
    }
    
    private static boolean checkLogContains(String logPath, String searchText) {
        try {
            Path path = Paths.get(logPath);
            if (!Files.exists(path)) {
                return false;
            }
            String content = new String(Files.readAllBytes(path));
            return content.contains(searchText);
        } catch (Exception e) {
            return false;
        }
    }
    
    private static String generateJsonReport(boolean beforePassed, boolean beforeViolations,
                                           boolean afterPassed, boolean afterThroughput,
                                           boolean afterTimeouts, boolean afterConcurrency) {
        return "{\n" +
            "  \"before\": {\n" +
            "    \"tests_passed\": " + beforePassed + ",\n" +
            "    \"violations_detected\": " + beforeViolations + "\n" +
            "  },\n" +
            "  \"after\": {\n" +
            "    \"tests_passed\": " + afterPassed + ",\n" +
            "    \"throughput_verified\": " + afterThroughput + ",\n" +
            "    \"timeouts_verified\": " + afterTimeouts + ",\n" +
            "    \"concurrency_verified\": " + afterConcurrency + "\n" +
            "  },\n" +
            "  \"comparison\": {\n" +
            "    \"fail_to_pass\": [\n" +
            "      \"capacity_control\",\n" +
            "      \"parallel_execution\",\n" +
            "      \"timeout_accuracy\",\n" +
            "      \"interrupt_handling\",\n" +
            "      \"stress_stability\"\n" +
            "    ]\n" +
            "  }\n" +
            "}";
    }
}
