import org.junit.jupiter.api.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * META-TEST SUITE
 * Verifies the quality and completeness of the test suite in repository_after.
 * ACTUALLY RUNS the DeepMerge implementation to verify correctness.
 */
@DisplayName("Meta-Tests: Verifying Test Suite Quality")
public class DeepMergeMetaTest {

    private static String testFileContent;

    @BeforeAll
    static void loadTestFile() throws IOException {
        String[] paths = {
            "../repository_after/deepmerge/src/test/java/DeepMergeTest.java",
            "repository_after/deepmerge/src/test/java/DeepMergeTest.java"
        };
        
        for (String pathStr : paths) {
            Path path = Paths.get(pathStr);
            if (Files.exists(path)) {
                testFileContent = Files.readString(path);
                return;
            }
        }
        testFileContent = "";
    }

    // ============================================================
    // Requirement 1: JUnit 5 Usage
    // ============================================================
    @Nested
    @DisplayName("Requirement 1: JUnit 5 Usage")
    class JUnit5UsageTest {

        @Test
        @DisplayName("Should import JUnit 5")
        void shouldImportJunit5() {
            assertTrue(testFileContent.contains("org.junit.jupiter"));
        }

        @Test
        @DisplayName("Should use @Test annotation")
        void shouldUseTestAnnotation() {
            assertTrue(testFileContent.contains("@Test"));
        }
    }

    // ============================================================
    // Requirement 2: Single Test File
    // ============================================================
    @Nested
    @DisplayName("Requirement 2: Single Test File")
    class SingleTestFileTest {

        @Test
        @DisplayName("Test file should exist")
        void testFileShouldExist() {
            assertFalse(testFileContent.isEmpty());
        }

        @Test
        @DisplayName("Should have public test class")
        void shouldHavePublicTestClass() {
            assertTrue(testFileContent.contains("public class DeepMergeTest"));
        }
    }

    // ============================================================
    // Requirement 3: Deterministic Tests
    // ============================================================
    @Nested
    @DisplayName("Requirement 3: Deterministic Tests")
    class DeterministicTestsTest {

        @Test
        @DisplayName("Should not use Thread.sleep")
        void shouldNotUseThreadSleep() {
            assertFalse(testFileContent.contains("Thread.sleep"));
        }

        @Test
        @DisplayName("Random should use fixed seed")
        void randomShouldUseFixedSeed() {
            if (testFileContent.contains("new Random(")) {
                assertTrue(Pattern.compile("new Random\\(\\d+\\)").matcher(testFileContent).find());
            }
        }
    }

    // ============================================================
    // Requirement 4: No Skipped Tests
    // ============================================================
    @Nested
    @DisplayName("Requirement 4: No Skipped Tests")
    class NoSkippedTestsTest {

        @Test
        @DisplayName("Should not have @Disabled")
        void shouldNotHaveDisabled() {
            assertFalse(testFileContent.contains("@Disabled"));
        }
    }

    // ============================================================
    // Requirement 5: Invariant Documentation
    // ============================================================
    @Nested
    @DisplayName("Requirement 5: Invariant Documentation")
    class InvariantDocumentationTest {

        @Test
        @DisplayName("Should have @DisplayName annotations")
        void shouldHaveDisplayNames() {
            int testCount = countOccurrences(testFileContent, "@Test");
            int displayNameCount = countOccurrences(testFileContent, "@DisplayName");
            assertTrue(displayNameCount >= testCount * 0.8);
        }

        @Test
        @DisplayName("Should have invariant comments")
        void shouldHaveInvariantComments() {
            assertTrue(testFileContent.contains("Invariant:"));
        }
    }

    // ============================================================
    // Actual Execution Tests (Requirements 6-15)
    // ============================================================
    @Nested
    @DisplayName("Actual Execution Tests")
    class ActualExecutionTests {

        @Test
        @DisplayName("Should ACTUALLY verify Map merging")
        void shouldActuallyVerifyMapMerging() {
            Map<String, Object> target = new LinkedHashMap<>(Map.of("a", 1));
            Map<String, Object> source = new LinkedHashMap<>(Map.of("b", 2));
            
            DeepMerge.Result result = DeepMerge.merge(target, source, new DeepMerge.Options());
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertEquals(1, merged.get("a"));
            assertEquals(2, merged.get("b"));
        }

        @Test
        @DisplayName("Should ACTUALLY verify List CONCAT")
        void shouldActuallyVerifyListConcat() {
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(3, 4)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.CONCAT;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Integer> items = (List<Integer>) merged.get("items");
            
            assertEquals(Arrays.asList(1, 2, 3, 4), items);
        }

        @Test
        @DisplayName("Should ACTUALLY verify null handling")
        void shouldActuallyVerifyNullHandling() {
            Map<String, Object> source = new LinkedHashMap<>(Map.of("key", "value"));
            DeepMerge.Result result = DeepMerge.merge(null, source, new DeepMerge.Options());
            assertNotNull(result.value);
        }

        @Test
        @DisplayName("Should ACTUALLY verify __proto__ blocked")
        void shouldActuallyVerifyProtoBlocked() {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "malicious");
            source.put("safe", "value");
            
            DeepMerge.Result result = DeepMerge.merge(null, source, new DeepMerge.Options());
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertFalse(merged.containsKey("__proto__"));
            assertEquals("value", merged.get("safe"));
        }

        @Test
        @DisplayName("Should ACTUALLY verify deep nested blocking")
        void shouldActuallyVerifyDeepNestedBlocking() {
            Map<String, Object> nested = new LinkedHashMap<>();
            nested.put("constructor", "blocked");
            nested.put("valid", "ok");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("nested", nested);
            
            DeepMerge.Result result = DeepMerge.merge(null, source, new DeepMerge.Options());
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> n = (Map<String, Object>) merged.get("nested");
            
            assertFalse(n.containsKey("constructor"));
            assertEquals("ok", n.get("valid"));
        }

        @Test
        @DisplayName("Should ACTUALLY verify path-based blocking")
        void shouldActuallyVerifyPathBasedBlocking() {
            Map<String, Object> secrets = new LinkedHashMap<>();
            secrets.put("password", "secret");
            
            Map<String, Object> other = new LinkedHashMap<>();
            other.put("password", "allowed");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("secrets", secrets);
            source.put("other", other);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule("root.secrets", Set.of("password"), null, false));
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> s = (Map<String, Object>) merged.get("secrets");
            @SuppressWarnings("unchecked")
            Map<String, Object> o = (Map<String, Object>) merged.get("other");
            
            assertFalse(s.containsKey("password"));
            assertEquals("allowed", o.get("password"));
        }

        @Test
        @DisplayName("Should ACTUALLY verify protectKeys=false")
        void shouldActuallyVerifyProtectKeysFalse() {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "allowed");
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.protectKeys = false;
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertEquals("allowed", merged.get("__proto__"));
        }

        @Test
        @DisplayName("Should ACTUALLY verify non-String keys")
        void shouldActuallyVerifyNonStringKeys() {
            Map<Object, Object> source = new LinkedHashMap<>();
            source.put(123, "value");
            
            DeepMerge.Result result = DeepMerge.merge(null, source, new DeepMerge.Options());
            
            @SuppressWarnings("unchecked")
            Map<Object, Object> merged = (Map<Object, Object>) result.value;
            assertEquals("value", merged.get(123));
        }

        @Test
        @DisplayName("Should ACTUALLY verify rule precedence")
        void shouldActuallyVerifyRulePrecedence() {
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(3, 4)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule("root.items", null, DeepMerge.ArrayStrategy.REPLACE, false));
            options.rules.add(new DeepMerge.PathRule("root.items", null, DeepMerge.ArrayStrategy.CONCAT, false));
            
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Integer> items = (List<Integer>) merged.get("items");
            
            assertEquals(4, items.size());
        }

        @Test
        @DisplayName("Should ACTUALLY verify extraBlockedKeys union")
        void shouldActuallyVerifyExtraBlockedKeysUnion() {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("secret1", "v1");
            source.put("secret2", "v2");
            source.put("public", "visible");
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule("root", Set.of("secret1"), null, false));
            options.rules.add(new DeepMerge.PathRule("root", Set.of("secret2"), null, false));
            
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            assertFalse(merged.containsKey("secret1"));
            assertFalse(merged.containsKey("secret2"));
            assertEquals("visible", merged.get("public"));
        }
    }

    // ============================================================
    // Test Structure Quality
    // ============================================================
    @Nested
    @DisplayName("Test Structure Quality")
    class TestStructureQualityTest {

        @Test
        @DisplayName("Should have @Nested classes")
        void shouldHaveNestedClasses() {
            int nestedCount = countOccurrences(testFileContent, "@Nested");
            assertTrue(nestedCount >= 5, "Should have at least 5 @Nested, found: " + nestedCount);
        }

        @Test
        @DisplayName("Should have 30+ tests")
        void shouldHaveSufficientTests() {
            int testCount = countOccurrences(testFileContent, "@Test");
            assertTrue(testCount >= 30, "Should have at least 30 tests, found: " + testCount);
        }

        @Test
        @DisplayName("Should have 50+ assertions")
        void shouldHaveSufficientAssertions() {
            int assertCount = countOccurrences(testFileContent, "assert");
            assertTrue(assertCount >= 50, "Should have at least 50 assertions, found: " + assertCount);
        }
    }

    // ============================================================
    // Helper Methods
    // ============================================================
    private static int countOccurrences(String text, String pattern) {
        int count = 0;
        int idx = 0;
        while ((idx = text.indexOf(pattern, idx)) != -1) {
            count++;
            idx += pattern.length();
        }
        return count;
    }
}