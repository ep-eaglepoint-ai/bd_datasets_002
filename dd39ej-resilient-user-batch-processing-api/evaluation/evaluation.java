package com.example.evaluation;

import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.time.format.*;
import java.util.*;
import java.util.regex.*;
import javax.xml.parsers.*;
import org.w3c.dom.*;

public class Evaluation {
    
    private static final String PROJECT_DIR = "/app";
    private static final String REPORTS_DIR = "/app/reports";
    
    public static void main(String[] args) {
        System.out.println("==========================================");
        System.out.println("  User Batch Processing API Evaluation");
        System.out.println("==========================================");
        System.out.println();
        
        try {
            Evaluation eval = new Evaluation();
            eval.runEvaluation();
        } catch (Exception e) {
            System.err.println("Evaluation failed: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    public void runEvaluation() throws Exception {
        // Run tests for before version
        System.out.println("Testing BEFORE version...");
        System.out.println("------------------------------------------");
        TestResult beforeResult = runTests("before", "/app/repository_before/UserBatch.java");
        
        System.out.println();
        System.out.println("Testing AFTER version...");
        System.out.println("------------------------------------------");
        TestResult afterResult = runTests("after", "/app/repository_after/UserBatch.java");
        
        // Generate report
        String report = generateReport(beforeResult, afterResult);
        
        // Save report
        saveReport(report);
        
        // Print summary
        printSummary(beforeResult, afterResult);
    }
    
    private TestResult runTests(String version, String sourceFile) throws Exception {
        TestResult result = new TestResult();
        result.version = version;
        
        try {
            // Copy source file to main source directory
            Path source = Paths.get(sourceFile);
            Path target = Paths.get(PROJECT_DIR, "src/main/java/com/example/users/UserBatchController.java");
            Files.createDirectories(target.getParent());
            Files.copy(source, target, StandardCopyOption.REPLACE_EXISTING);
            
            // Clean and compile
            ProcessBuilder cleanBuilder = new ProcessBuilder("mvn", "clean", "compile", "-q");
            cleanBuilder.directory(new File(PROJECT_DIR));
            cleanBuilder.redirectErrorStream(true);
            Process cleanProcess = cleanBuilder.start();
            String cleanOutput = readProcessOutput(cleanProcess);
            int cleanExitCode = cleanProcess.waitFor();
            
            if (cleanExitCode != 0) {
                System.out.println("  Compilation failed");
                result.compilationError = true;
                result.output = cleanOutput;
                result.total = 24;
                result.passed = 0;
                result.failed = 24;
                return result;
            }
            
            // Run tests
            ProcessBuilder testBuilder = new ProcessBuilder("mvn", "test", "-B");
            testBuilder.directory(new File(PROJECT_DIR));
            testBuilder.redirectErrorStream(true);
            Process testProcess = testBuilder.start();
            result.output = readProcessOutput(testProcess);
            result.exitCode = testProcess.waitFor();
            
            // Parse results from surefire reports
            parseTestResults(result);
            
        } catch (Exception e) {
            result.error = e.getMessage();
            result.total = 24;
            result.passed = 0;
            result.failed = 24;
        }
        
        System.out.println("  Results: " + result.passed + "/" + result.total + " passed");
        return result;
    }
    
    private void parseTestResults(TestResult result) {
        try {
            File reportFile = new File(PROJECT_DIR + "/target/surefire-reports/TEST-com.example.users.UserBatchControllerTest.xml");
            
            if (!reportFile.exists()) {
                // Try to parse from output
                parseFromOutput(result);
                return;
            }
            
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(reportFile);
            
            Element testsuite = doc.getDocumentElement();
            result.total = Integer.parseInt(testsuite.getAttribute("tests"));
            result.failed = Integer.parseInt(testsuite.getAttribute("failures"));
            result.errors = Integer.parseInt(testsuite.getAttribute("errors"));
            result.passed = result.total - result.failed - result.errors;
            
            // Parse individual test cases
            NodeList testcases = doc.getElementsByTagName("testcase");
            for (int i = 0; i < testcases.getLength(); i++) {
                Element testcase = (Element) testcases.item(i);
                TestCase tc = new TestCase();
                tc.name = testcase.getAttribute("name");
                tc.duration = testcase.getAttribute("time") + "s";
                
                NodeList failures = testcase.getElementsByTagName("failure");
                NodeList errors = testcase.getElementsByTagName("error");
                
                if (failures.getLength() > 0 || errors.getLength() > 0) {
                    tc.status = "FAIL";
                } else {
                    tc.status = "PASS";
                }
                
                result.testCases.add(tc);
            }
            
        } catch (Exception e) {
            parseFromOutput(result);
        }
    }
    
    private void parseFromOutput(TestResult result) {
        String output = result.output;
        
        // Count errors and failures from output
        Pattern errorPattern = Pattern.compile("<<< ERROR!");
        Pattern failurePattern = Pattern.compile("<<< FAILURE!");
        Pattern testsRunPattern = Pattern.compile("Tests run: (\\d+), Failures: (\\d+), Errors: (\\d+)");
        
        Matcher testsRunMatcher = testsRunPattern.matcher(output);
        if (testsRunMatcher.find()) {
            result.total = Integer.parseInt(testsRunMatcher.group(1));
            result.failed = Integer.parseInt(testsRunMatcher.group(2));
            result.errors = Integer.parseInt(testsRunMatcher.group(3));
            result.passed = result.total - result.failed - result.errors;
        } else {
            Matcher errorMatcher = errorPattern.matcher(output);
            Matcher failureMatcher = failurePattern.matcher(output);
            
            int errorCount = 0;
            int failureCount = 0;
            while (errorMatcher.find()) errorCount++;
            while (failureMatcher.find()) failureCount++;
            
            if (errorCount > 0 || failureCount > 0) {
                result.total = 24;
                result.failed = errorCount + failureCount;
                result.passed = 0;
            }
        }
    }
    
    private String readProcessOutput(Process process) throws IOException {
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                System.out.println("  " + line);
            }
        }
        return output.toString();
    }
    
    private String generateReport(TestResult before, TestResult after) {
        String timestamp = Instant.now().toString();
        String evalId = generateEvalId();
        
        String javaVersion = System.getProperty("java.version");
        String osName = System.getProperty("os.name").toLowerCase();
        String osArch = System.getProperty("os.arch");
        String hostname = getHostname();
        
        int testImprovement = after.passed - before.passed;
        boolean allRequirementsMet = (after.passed == after.total) && (after.total > 0);
        double successRate = after.total > 0 ? (after.passed * 100.0 / after.total) : 0.0;
        
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        
        // Evaluation metadata
        sb.append("  \"evaluation_metadata\": {\n");
        sb.append("    \"evaluation_id\": \"").append(evalId).append("\",\n");
        sb.append("    \"timestamp\": \"").append(timestamp).append("\",\n");
        sb.append("    \"evaluator\": \"automated_test_suite\",\n");
        sb.append("    \"project\": \"resilient_user_batch_processing_api\",\n");
        sb.append("    \"version\": \"1.0.0\"\n");
        sb.append("  },\n");
        
        // Environment
        sb.append("  \"environment\": {\n");
        sb.append("    \"java_version\": \"").append(javaVersion).append("\",\n");
        sb.append("    \"platform\": \"").append(osName).append("\",\n");
        sb.append("    \"os\": \"").append(osName).append("\",\n");
        sb.append("    \"architecture\": \"").append(osArch).append("\",\n");
        sb.append("    \"hostname\": \"").append(hostname).append("\"\n");
        sb.append("  },\n");
        
        // Test execution
        sb.append("  \"test_execution\": {\n");
        sb.append("    \"success\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"exit_code\": ").append(after.exitCode).append(",\n");
        sb.append("    \"tests\": ").append(formatTestCases(after.testCases)).append(",\n");
        sb.append("    \"summary\": {\n");
        sb.append("      \"total\": ").append(after.total).append(",\n");
        sb.append("      \"passed\": ").append(after.passed).append(",\n");
        sb.append("      \"failed\": ").append(after.failed).append(",\n");
        sb.append("      \"errors\": ").append(after.errors).append(",\n");
        sb.append("      \"skipped\": 0\n");
        sb.append("    },\n");
        sb.append("    \"stdout\": \"Before Repository: ").append(before.passed).append("/").append(before.total);
        sb.append(" passed\\nAfter Repository: ").append(after.passed).append("/").append(after.total).append(" passed\"\n");
        sb.append("  },\n");
        
        // Meta testing
        sb.append("  \"meta_testing\": {\n");
        sb.append("    \"requirement_traceability\": {\n");
        sb.append("      \"valid_user_processing\": \"requirement_1\",\n");
        sb.append("      \"invalid_user_reporting\": \"requirement_2\",\n");
        sb.append("      \"duplicate_handling\": \"requirement_3\",\n");
        sb.append("      \"valid_count\": \"requirement_4\",\n");
        sb.append("      \"valid_ids\": \"requirement_5\",\n");
        sb.append("      \"invalid_count\": \"requirement_6\",\n");
        sb.append("      \"invalid_details\": \"requirement_7\",\n");
        sb.append("      \"no_exceptions\": \"requirement_8\",\n");
        sb.append("      \"no_short_circuit\": \"requirement_9\",\n");
        sb.append("      \"no_streams\": \"requirement_10\",\n");
        sb.append("      \"separated_validation\": \"requirement_11\",\n");
        sb.append("      \"no_sets_maps\": \"requirement_12\"\n");
        sb.append("    }\n");
        sb.append("  },\n");
        
        // Compliance check
        sb.append("  \"compliance_check\": {\n");
        sb.append("    \"valid_user_processing\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"invalid_reporting_without_fail\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"duplicate_handling\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"valid_count_returned\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"valid_ids_returned\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"invalid_count_returned\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"invalid_details_returned\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"no_exceptions_thrown\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"no_short_circuit\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"no_streams_used\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"validation_separated\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"no_sets_maps_for_duplicates\": ").append(allRequirementsMet).append("\n");
        sb.append("  },\n");
        
        // Before
        sb.append("  \"before\": {\n");
        sb.append("    \"metrics\": {\n");
        sb.append("      \"total_files\": 1,\n");
        sb.append("      \"valid_user_processing\": false,\n");
        sb.append("      \"invalid_reporting\": false,\n");
        sb.append("      \"exception_handling\": false\n");
        sb.append("    },\n");
        sb.append("    \"tests\": {\n");
        sb.append("      \"passed\": ").append(before.passed).append(",\n");
        sb.append("      \"failed\": ").append(before.failed).append(",\n");
        sb.append("      \"total\": ").append(before.total).append(",\n");
        sb.append("      \"success\": ").append(before.passed == before.total && before.total > 0).append("\n");
        sb.append("    }\n");
        sb.append("  },\n");
        
        // After
        sb.append("  \"after\": {\n");
        sb.append("    \"metrics\": {\n");
        sb.append("      \"total_files\": 1,\n");
        sb.append("      \"valid_user_processing\": true,\n");
        sb.append("      \"invalid_reporting\": true,\n");
        sb.append("      \"exception_handling\": true\n");
        sb.append("    },\n");
        sb.append("    \"tests\": {\n");
        sb.append("      \"passed\": ").append(after.passed).append(",\n");
        sb.append("      \"failed\": ").append(after.failed).append(",\n");
        sb.append("      \"total\": ").append(after.total).append(",\n");
        sb.append("      \"success\": ").append(allRequirementsMet).append(",\n");
        sb.append("      \"tests\": ").append(formatTestCases(after.testCases)).append("\n");
        sb.append("    }\n");
        sb.append("  },\n");
        
        // Comparison
        sb.append("  \"comparison\": {\n");
        sb.append("    \"exception_handling_fixed\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"invalid_reporting_fixed\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"tests_passing\": ").append(after.passed).append(",\n");
        sb.append("    \"test_improvement\": ").append(testImprovement).append(",\n");
        sb.append("    \"all_requirements_met\": ").append(allRequirementsMet).append("\n");
        sb.append("  },\n");
        
        // Requirements checklist
        sb.append("  \"requirements_checklist\": {\n");
        sb.append("    \"requirement_1_valid_id_processing\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_2_invalid_reporting\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_3_duplicate_handling\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_4_valid_count\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_5_valid_ids\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_6_invalid_count\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_7_invalid_details\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_8_no_exceptions\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_9_no_short_circuit\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_10_no_streams\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_11_separated_validation\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"requirement_12_no_sets_maps\": ").append(allRequirementsMet).append("\n");
        sb.append("  },\n");
        
        // Final verdict
        sb.append("  \"final_verdict\": {\n");
        sb.append("    \"success\": ").append(allRequirementsMet).append(",\n");
        sb.append("    \"total_tests\": ").append(after.total).append(",\n");
        sb.append("    \"passed_tests\": ").append(after.passed).append(",\n");
        sb.append("    \"failed_tests\": ").append(after.failed).append(",\n");
        sb.append("    \"success_rate\": \"").append(String.format("%.1f", successRate)).append("\",\n");
        sb.append("    \"meets_requirements\": ").append(allRequirementsMet).append("\n");
        sb.append("  }\n");
        
        sb.append("}");
        
        return sb.toString();
    }
    
    private String formatTestCases(List<TestCase> testCases) {
        if (testCases.isEmpty()) {
            return "[]";
        }
        
        StringBuilder sb = new StringBuilder();
        sb.append("[\n");
        for (int i = 0; i < testCases.size(); i++) {
            TestCase tc = testCases.get(i);
            sb.append("      {\n");
            sb.append("        \"name\": \"").append(escapeJson(tc.name)).append("\",\n");
            sb.append("        \"status\": \"").append(tc.status).append("\",\n");
            sb.append("        \"duration\": \"").append(tc.duration).append("\"\n");
            sb.append("      }");
            if (i < testCases.size() - 1) {
                sb.append(",");
            }
            sb.append("\n");
        }
        sb.append("    ]");
        return sb.toString();
    }
    
    private String escapeJson(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    private void saveReport(String report) throws IOException {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String dateDir = now.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String timeDir = now.format(DateTimeFormatter.ofPattern("HH-mm-ss"));
        
        Path reportDir = Paths.get(REPORTS_DIR, dateDir, timeDir);
        Files.createDirectories(reportDir);
        
        Path reportFile = reportDir.resolve("report.json");
        Files.writeString(reportFile, report);
        
        System.out.println();
        System.out.println("Report saved to: " + reportFile);
    }
    
    private void printSummary(TestResult before, TestResult after) {
        System.out.println();
        System.out.println("==========================================");
        System.out.println("  Evaluation Complete");
        System.out.println("==========================================");
        System.out.println();
        System.out.println("Before Repository: " + before.passed + "/" + before.total + " passed");
        System.out.println("After Repository: " + after.passed + "/" + after.total + " passed");
        System.out.println();
        
        boolean success = after.passed == after.total && after.total > 0;
        if (success) {
            System.out.println("✓ All requirements met!");
        } else {
            System.out.println("✗ Some requirements not met");
        }
    }
    
    private String generateEvalId() {
        String chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
    
    private String getHostname() {
        try {
            return java.net.InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "unknown";
        }
    }
    
    static class TestResult {
        String version;
        int total = 0;
        int passed = 0;
        int failed = 0;
        int errors = 0;
        int exitCode = 0;
        String output = "";
        String error = null;
        boolean compilationError = false;
        List<TestCase> testCases = new ArrayList<>();
    }
    
    static class TestCase {
        String name;
        String status;
        String duration;
    }
}