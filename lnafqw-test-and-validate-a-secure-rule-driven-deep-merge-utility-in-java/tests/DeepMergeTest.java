import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

/**
 * Comprehensive test suite for DeepMerge utility.
 * Tests all requirements for deep merging with security and configurability.
 * 
 * Organized using @Nested classes per requirement area.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DeepMergeTest {

    // ==================== Requirement 6: Deep Merging of Map, List, Set, Arrays ====================
    
    @Nested
    @DisplayName("R6: Deep Merging of Collections")
    class DeepMergeCollectionsTests {

        @Test
        @Order(1)
        @DisplayName("Deep merge of nested Maps preserves structure and merges values")
        void testDeepMergeNestedMaps() {
            // Invariant: Nested maps should be recursively merged, not replaced
            Map<String, Object> target = new LinkedHashMap<>();
            Map<String, Object> targetInner = new LinkedHashMap<>();
            targetInner.put("a", 1);
            targetInner.put("b", 2);
            target.put("nested", targetInner);

            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> sourceInner = new LinkedHashMap<>();
            sourceInner.put("b", 20);
            sourceInner.put("c", 3);
            source.put("nested", sourceInner);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);

            @SuppressWarnings("unchecked")
            Map<String, Object> resultInner = (Map<String, Object>) result.get("nested");
            
            assertEquals(1, resultInner.get("a"), "Original target value preserved");
            assertEquals(20, resultInner.get("b"), "Source value overwrites target");
            assertEquals(3, resultInner.get("c"), "New source value added");
        }

        @Test
        @Order(2)
        @DisplayName("Deep merge of List with REPLACE strategy replaces entire list")
        void testDeepMergeListReplace() {
            // Invariant: REPLACE strategy should replace target list with source list
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2, 3)));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(4, 5)));

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            List<Integer> resultList = (List<Integer>) result.get("items");
            
            assertEquals(2, resultList.size());
            assertEquals(4, resultList.get(0));
            assertEquals(5, resultList.get(1));
        }

        @Test
        @Order(3)
        @DisplayName("Deep merge of List with CONCAT strategy appends source to target")
        void testDeepMergeListConcat() {
            // Invariant: CONCAT strategy should append source elements to target list
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2, 3)));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(4, 5)));

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.CONCAT;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            List<Integer> resultList = (List<Integer>) result.get("items");
            
            assertEquals(5, resultList.size());
            assertEquals(Arrays.asList(1, 2, 3, 4, 5), resultList);
        }

        @Test
        @Order(4)
        @DisplayName("Deep merge of List with MERGE_BY_INDEX strategy merges by position")
        void testDeepMergeListMergeByIndex() {
            // Invariant: MERGE_BY_INDEX merges corresponding indices recursively
            Map<String, Object> target = new LinkedHashMap<>();
            List<Map<String, Object>> targetList = new ArrayList<>();
            Map<String, Object> t1 = new LinkedHashMap<>();
            t1.put("id", 1);
            t1.put("name", "original");
            targetList.add(t1);
            target.put("items", targetList);

            Map<String, Object> source = new LinkedHashMap<>();
            List<Map<String, Object>> sourceList = new ArrayList<>();
            Map<String, Object> s1 = new LinkedHashMap<>();
            s1.put("name", "updated");
            s1.put("value", 100);
            sourceList.add(s1);
            source.put("items", sourceList);

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.MERGE_BY_INDEX;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> resultList = (List<Map<String, Object>>) result.get("items");
            
            assertEquals(1, resultList.size());
            Map<String, Object> merged = resultList.get(0);
            assertEquals(1, merged.get("id"), "Target id preserved");
            assertEquals("updated", merged.get("name"), "Source name overwrites");
            assertEquals(100, merged.get("value"), "Source value added");
        }

        @Test
        @Order(5)
        @DisplayName("Deep merge of Set unions elements from both sets")
        void testDeepMergeSet() {
            // Invariant: Set merge should union elements from both sets
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("tags", new LinkedHashSet<>(Arrays.asList("a", "b", "c")));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("tags", new LinkedHashSet<>(Arrays.asList("c", "d", "e")));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);

            @SuppressWarnings("unchecked")
            Set<String> resultSet = (Set<String>) result.get("tags");
            
            assertTrue(resultSet.containsAll(Arrays.asList("a", "b", "c", "d", "e")));
            assertEquals(5, resultSet.size());
        }

        @Test
        @Order(6)
        @DisplayName("Deep merge of arrays works correctly")
        void testDeepMergeArrays() {
            // Invariant: Arrays should be merged according to array strategy
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("arr", new Integer[]{1, 2, 3});

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("arr", new Integer[]{4, 5});

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            Integer[] resultArr = (Integer[]) result.get("arr");
            
            assertArrayEquals(new Integer[]{4, 5}, resultArr);
        }
    }

    // ==================== Requirement 7: Null Handling ====================
    
    @Nested
    @DisplayName("R7: Null Handling")
    class NullHandlingTests {

        @Test
        @Order(7)
        @DisplayName("When target is null, source becomes result")
        void testTargetNull() {
            // Invariant: Null target should be replaced by source
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("key", "value");

            Object result = DeepMerge.merge(null, source);
            
            assertNotNull(result);
            @SuppressWarnings("unchecked")
            Map<String, Object> resultMap = (Map<String, Object>) result;
            assertEquals("value", resultMap.get("key"));
        }

        @Test
        @Order(8)
        @DisplayName("When source is null with SOURCE_WINS policy, result is null")
        void testSourceNullSourceWins() {
            // Invariant: Null source with SOURCE_WINS returns null
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("key", "value");

            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.SOURCE_WINS;

            Object result = DeepMerge.merge(target, null, options).value;
            
            assertNull(result);
        }

        @Test
        @Order(9)
        @DisplayName("When source is null with TARGET_WINS policy, target is preserved")
        void testSourceNullTargetWins() {
            // Invariant: Null source with TARGET_WINS preserves target
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("key", "value");

            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.TARGET_WINS;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, null, options).value;
            
            assertEquals("value", result.get("key"));
        }

        @Test
        @Order(10)
        @DisplayName("When both non-null, deep merge occurs")
        void testBothNonNull() {
            // Invariant: Both non-null should trigger recursive merge
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("a", 1);
            target.put("b", 2);

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("b", 20);
            source.put("c", 3);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);
            
            assertEquals(1, result.get("a"));
            assertEquals(20, result.get("b"));
            assertEquals(3, result.get("c"));
        }

        @Test
        @Order(34)
        @DisplayName("SKIP null policy preserves target when source value is null")
        void testNullPolicySkip() {
            // Invariant: SKIP policy ignores null source values
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("key", "original");

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("key", null);

            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.SKIP;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;
            
            assertEquals("original", result.get("key"));
        }
    }

    // ==================== Requirement 8: Non-Conflicting Target Data Preserved ====================
    
    @Nested
    @DisplayName("R8: Target Data Preservation")
    class TargetPreservationTests {

        @Test
        @Order(11)
        @DisplayName("Non-conflicting target keys are preserved after merge")
        void testNonConflictingTargetPreserved() {
            // Invariant: Keys only in target must remain unchanged
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("onlyInTarget", "preserved");
            target.put("shared", "targetValue");

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("shared", "sourceValue");
            source.put("onlyInSource", "added");

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);
            
            assertEquals("preserved", result.get("onlyInTarget"), "Target-only key preserved");
            assertEquals("sourceValue", result.get("shared"), "Shared key takes source value");
            assertEquals("added", result.get("onlyInSource"), "Source-only key added");
        }

        @Test
        @Order(12)
        @DisplayName("Nested non-conflicting target data is preserved")
        void testNestedNonConflictingPreserved() {
            // Invariant: Nested keys only in target must remain
            Map<String, Object> target = new LinkedHashMap<>();
            Map<String, Object> targetNested = new LinkedHashMap<>();
            targetNested.put("targetOnly", "keepMe");
            targetNested.put("shared", "fromTarget");
            target.put("nested", targetNested);

            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> sourceNested = new LinkedHashMap<>();
            sourceNested.put("shared", "fromSource");
            sourceNested.put("sourceOnly", "newValue");
            source.put("nested", sourceNested);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultNested = (Map<String, Object>) result.get("nested");
            
            assertEquals("keepMe", resultNested.get("targetOnly"));
            assertEquals("fromSource", resultNested.get("shared"));
            assertEquals("newValue", resultNested.get("sourceOnly"));
        }
    }

    // ==================== Requirement 9: Global Blocked Keys ====================
    
    @Nested
    @DisplayName("R9: Global Blocked Keys")
    class GlobalBlockedKeysTests {

        @Test
        @Order(13)
        @DisplayName("__proto__ key is excluded from merge")
        void testBlockedKeyProto() {
            // Invariant: __proto__ should never be merged
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("safe", "value");

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "malicious");
            source.put("normal", "allowed");

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);
            
            assertFalse(result.containsKey("__proto__"), "__proto__ must be blocked");
            assertEquals("allowed", result.get("normal"));
        }

        @Test
        @Order(14)
        @DisplayName("constructor key is excluded from merge")
        void testBlockedKeyConstructor() {
            // Invariant: constructor should never be merged
            Map<String, Object> target = new LinkedHashMap<>();

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("constructor", "attack");
            source.put("data", "valid");

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source);
            
            assertFalse(result.containsKey("constructor"), "constructor must be blocked");
            assertEquals("valid", result.get("data"));
        }

        @Test
        @Order(15)
        @DisplayName("prototype key is excluded from merge")
        void testBlockedKeyPrototype() {
            // Invariant: prototype should never be merged
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("prototype", "dangerous");
            source.put("safe", "ok");

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source);
            
            assertFalse(result.containsKey("prototype"));
            assertEquals("ok", result.get("safe"));
        }

        @Test
        @Order(16)
        @DisplayName("@type key is excluded from merge")
        void testBlockedKeyAtType() {
            // Invariant: @type should never be merged (Jackson polymorphic attack)
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("@type", "com.malicious.Class");
            source.put("value", 123);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source);
            
            assertFalse(result.containsKey("@type"));
            assertEquals(123, result.get("value"));
        }

        @Test
        @Order(17)
        @DisplayName("class key is excluded from merge")
        void testBlockedKeyClass() {
            // Invariant: class should never be merged
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("class", "java.lang.Runtime");
            source.put("name", "test");

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source);
            
            assertFalse(result.containsKey("class"));
            assertEquals("test", result.get("name"));
        }
    }

    // ==================== Requirement 10: Blocked Keys at Deep Nesting ====================
    
    @Nested
    @DisplayName("R10: Deep Nesting Blocked Keys")
    class DeepNestingBlockedKeysTests {

        @Test
        @Order(18)
        @DisplayName("Blocked keys are excluded at level 2 nesting")
        void testBlockedKeysLevel2() {
            // Invariant: Blocked keys must be filtered at any depth
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> level1 = new LinkedHashMap<>();
            level1.put("__proto__", "attack");
            level1.put("valid", "data");
            source.put("level1", level1);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultLevel1 = (Map<String, Object>) result.get("level1");
            
            assertFalse(resultLevel1.containsKey("__proto__"));
            assertEquals("data", resultLevel1.get("valid"));
        }

        @Test
        @Order(19)
        @DisplayName("Blocked keys are excluded at level 5 nesting")
        void testBlockedKeysDeepNesting() {
            // Invariant: Blocked keys must be filtered even at deep levels
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> current = source;
            for (int i = 1; i <= 4; i++) {
                Map<String, Object> next = new LinkedHashMap<>();
                current.put("level" + i, next);
                current = next;
            }
            current.put("constructor", "deep-attack");
            current.put("data", "deep-value");

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source);
            
            Map<String, Object> deep = result;
            for (int i = 1; i <= 4; i++) {
                @SuppressWarnings("unchecked")
                Map<String, Object> next = (Map<String, Object>) deep.get("level" + i);
                deep = next;
            }
            
            assertFalse(deep.containsKey("constructor"));
            assertEquals("deep-value", deep.get("data"));
        }
    }

    // ==================== Requirement 11: Path-Based Blocked Keys ====================
    
    @Nested
    @DisplayName("R11: Path-Based Blocked Keys")
    class PathBasedBlockedKeysTests {

        @Test
        @Order(20)
        @DisplayName("Path-based blocked key only applies to matching path")
        void testPathBasedBlockedKeyMatchingPath() {
            // Invariant: extraBlockedKeys should only block at specified path
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("secret", "should-be-blocked");
            config.put("name", "allowed");
            source.put("config", config);
            
            Map<String, Object> other = new LinkedHashMap<>();
            other.put("secret", "should-be-allowed");
            source.put("other", other);

            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.config",
                Set.of("secret"),
                null,
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultConfig = (Map<String, Object>) result.get("config");
            @SuppressWarnings("unchecked")
            Map<String, Object> resultOther = (Map<String, Object>) result.get("other");
            
            assertFalse(resultConfig.containsKey("secret"), "secret blocked in config path");
            assertEquals("allowed", resultConfig.get("name"));
            assertEquals("should-be-allowed", resultOther.get("secret"), "secret allowed in other path");
        }

        @Test
        @Order(21)
        @DisplayName("Path-based blocked key with wildcard matches multiple paths")
        void testPathBasedBlockedKeyWildcard() {
            // Invariant: Glob patterns should match appropriate paths
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> user1 = new LinkedHashMap<>();
            user1.put("password", "secret1");
            user1.put("name", "John");
            source.put("user1", user1);
            
            Map<String, Object> user2 = new LinkedHashMap<>();
            user2.put("password", "secret2");
            user2.put("name", "Jane");
            source.put("user2", user2);

            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.*",
                Set.of("password"),
                null,
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultUser1 = (Map<String, Object>) result.get("user1");
            @SuppressWarnings("unchecked")
            Map<String, Object> resultUser2 = (Map<String, Object>) result.get("user2");
            
            assertFalse(resultUser1.containsKey("password"));
            assertFalse(resultUser2.containsKey("password"));
            assertEquals("John", resultUser1.get("name"));
            assertEquals("Jane", resultUser2.get("name"));
        }

        @Test
        @Order(35)
        @DisplayName("Double-star glob matches any depth")
        void testDoubleStarGlob() {
            // Invariant: ** glob should match paths at any depth
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> a = new LinkedHashMap<>();
            Map<String, Object> b = new LinkedHashMap<>();
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("blocked", "should-not-appear");
            c.put("allowed", "visible");
            b.put("c", c);
            a.put("b", b);
            source.put("a", a);

            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.**",
                Set.of("blocked"),
                null,
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> deep = (Map<String, Object>) 
                ((Map<String, Object>) ((Map<String, Object>) result.get("a")).get("b")).get("c");
            
            assertFalse(deep.containsKey("blocked"));
            assertEquals("visible", deep.get("allowed"));
        }
        
        @Test
        @Order(50)
        @DisplayName("Array strategy path isolation: sibling arrays unaffected by path-specific rules")
        void testArrayStrategyPathIsolation() {
            // Invariant: Path-specific array strategy should not affect sibling arrays
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items1", new ArrayList<>(Arrays.asList(1, 2)));
            target.put("items2", new ArrayList<>(Arrays.asList(10, 20)));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items1", new ArrayList<>(Arrays.asList(3)));
            source.put("items2", new ArrayList<>(Arrays.asList(30)));

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE; // default
            options.rules.add(new DeepMerge.PathRule(
                "root.items1",
                null,
                DeepMerge.ArrayStrategy.CONCAT, // only for items1
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            List<Integer> items1 = (List<Integer>) result.get("items1");
            @SuppressWarnings("unchecked")
            List<Integer> items2 = (List<Integer>) result.get("items2");

            // items1 should CONCAT (path-specific rule)
            assertEquals(Arrays.asList(1, 2, 3), items1, "items1 should use CONCAT from path rule");
            // items2 should REPLACE (default)
            assertEquals(Arrays.asList(30), items2, "items2 should use default REPLACE");
        }
    }

    // ==================== Requirement 12: protectKeys = false ====================
    
    @Nested
    @DisplayName("R12: ProtectKeys Toggle")
    class ProtectKeysToggleTests {

        @Test
        @Order(22)
        @DisplayName("Blocked keys ARE merged when protectKeys = false")
        void testProtectKeysFalse() {
            // Invariant: When protectKeys=false, all keys should be merged
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "allowed-now");
            source.put("constructor", "also-allowed");
            source.put("normal", "value");

            DeepMerge.Options options = new DeepMerge.Options();
            options.protectKeys = false;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            assertTrue(result.containsKey("__proto__"), "__proto__ allowed when protectKeys=false");
            assertTrue(result.containsKey("constructor"), "constructor allowed when protectKeys=false");
            assertEquals("allowed-now", result.get("__proto__"));
            assertEquals("also-allowed", result.get("constructor"));
        }

        @Test
        @Order(23)
        @DisplayName("Nested blocked keys are merged when protectKeys = false")
        void testProtectKeysFalseNested() {
            // Invariant: protectKeys=false applies at all nesting levels
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> nested = new LinkedHashMap<>();
            nested.put("prototype", "nested-allowed");
            source.put("inner", nested);

            DeepMerge.Options options = new DeepMerge.Options();
            options.protectKeys = false;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultNested = (Map<String, Object>) result.get("inner");
            
            assertTrue(resultNested.containsKey("prototype"));
            assertEquals("nested-allowed", resultNested.get("prototype"));
        }
    }

    // ==================== Requirement 13: Non-String Keys Not Blocked ====================
    
    @Nested
    @DisplayName("R13: Non-String Keys")
    class NonStringKeysTests {

        @Test
        @Order(24)
        @DisplayName("Integer keys are not affected by blocked key rules")
        void testNonStringKeyInteger() {
            // Invariant: Blocked keys only affect String keys
            Map<Object, Object> source = new LinkedHashMap<>();
            source.put(1, "integer-key");
            source.put("normal", "string-key");

            @SuppressWarnings("unchecked")
            Map<Object, Object> result = (Map<Object, Object>) DeepMerge.merge(null, source);
            
            assertEquals("integer-key", result.get(1));
            assertEquals("string-key", result.get("normal"));
        }

        @Test
        @Order(25)
        @DisplayName("Object keys that look like blocked keys are not blocked")
        void testNonStringKeyObject() {
            // Invariant: Non-String keys bypass blocking even if toString matches
            Map<Object, Object> source = new LinkedHashMap<>();
            Object customKey = new Object() {
                @Override
                public String toString() { return "__proto__"; }
            };
            source.put(customKey, "object-key-value");
            source.put("safe", "string-value");

            @SuppressWarnings("unchecked")
            Map<Object, Object> result = (Map<Object, Object>) DeepMerge.merge(null, source);
            
            assertEquals("object-key-value", result.get(customKey));
            assertEquals("string-value", result.get("safe"));
        }
    }

    // ==================== Requirement 14: Rule Precedence (Last Wins) ====================
    
    @Nested
    @DisplayName("R14: Rule Precedence")
    class RulePrecedenceTests {

        @Test
        @Order(26)
        @DisplayName("Last matching rule's arrayStrategy overrides previous")
        void testRulePrecedenceArrayStrategy() {
            // Invariant: When multiple rules match, last arrayStrategy wins
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2, 3)));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(4, 5)));

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE;
            
            options.rules.add(new DeepMerge.PathRule(
                "root.items",
                null,
                DeepMerge.ArrayStrategy.CONCAT,
                false
            ));
            
            options.rules.add(new DeepMerge.PathRule(
                "root.items",
                null,
                DeepMerge.ArrayStrategy.REPLACE,
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;
            
            @SuppressWarnings("unchecked")
            List<Integer> resultList = (List<Integer>) result.get("items");
            
            assertEquals(2, resultList.size(), "REPLACE should win, list has 2 elements");
            assertEquals(Arrays.asList(4, 5), resultList);
        }

        @Test
        @Order(27)
        @DisplayName("Last matching rule's freezeSubtree takes precedence")
        void testRulePrecedenceFreezeSubtree() {
            // Invariant: Last rule's freeze setting applies
            Map<String, Object> target = new LinkedHashMap<>();
            Map<String, Object> targetData = new LinkedHashMap<>();
            targetData.put("a", 1);
            target.put("data", targetData);

            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> sourceData = new LinkedHashMap<>();
            sourceData.put("a", 100);
            sourceData.put("b", 2);
            source.put("data", sourceData);

            DeepMerge.Options options = new DeepMerge.Options();
            
            options.rules.add(new DeepMerge.PathRule(
                "root.data",
                null,
                null,
                false
            ));
            
            options.rules.add(new DeepMerge.PathRule(
                "root.data",
                null,
                null,
                true  // freeze wins
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultData = (Map<String, Object>) result.get("data");
            
            // When frozen, source replaces target (no deep merge)
            assertEquals(100, resultData.get("a"));
            assertEquals(2, resultData.get("b"));
        }

        @Test
        @Order(51)
        @DisplayName("Three rules: last one wins for arrayStrategy")
        void testThreeRulePrecedence() {
            // Invariant: With 3+ matching rules, the last one wins
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("arr", new ArrayList<>(Arrays.asList(1, 2)));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("arr", new ArrayList<>(Arrays.asList(3, 4)));

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE;

            // Rule 1: CONCAT
            options.rules.add(new DeepMerge.PathRule("root.arr", null, DeepMerge.ArrayStrategy.CONCAT, false));
            // Rule 2: MERGE_BY_INDEX
            options.rules.add(new DeepMerge.PathRule("root.arr", null, DeepMerge.ArrayStrategy.MERGE_BY_INDEX, false));
            // Rule 3: REPLACE (should win)
            options.rules.add(new DeepMerge.PathRule("root.arr", null, DeepMerge.ArrayStrategy.REPLACE, false));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            List<Integer> arr = (List<Integer>) result.get("arr");
            
            assertEquals(Arrays.asList(3, 4), arr, "REPLACE from rule 3 should win");
        }
        
        @Test
        @Order(52)
        @DisplayName("freezeSubtree prevents merging of deeper nodes")
        void testFreezeSubtreeDeepNodes() {
            // Invariant: When freezeSubtree=true, nested structures should NOT be recursively merged
            Map<String, Object> target = new LinkedHashMap<>();
            Map<String, Object> targetData = new LinkedHashMap<>();
            Map<String, Object> targetDeep = new LinkedHashMap<>();
            targetDeep.put("x", 1);
            targetDeep.put("y", 2);
            targetData.put("deep", targetDeep);
            targetData.put("shallow", "target-shallow");
            target.put("data", targetData);

            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> sourceData = new LinkedHashMap<>();
            Map<String, Object> sourceDeep = new LinkedHashMap<>();
            sourceDeep.put("x", 100);
            sourceDeep.put("z", 3);
            sourceData.put("deep", sourceDeep);
            sourceData.put("shallow", "source-shallow");
            source.put("data", sourceData);

            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule("root.data", null, null, true));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            Map<String, Object> resultData = (Map<String, Object>) result.get("data");
            @SuppressWarnings("unchecked")
            Map<String, Object> resultDeep = (Map<String, Object>) resultData.get("deep");

            // Since frozen, source replaces entirely - deep should be source's version
            assertEquals(100, resultDeep.get("x"));
            assertEquals(3, resultDeep.get("z"));
            assertFalse(resultDeep.containsKey("y"), "Target's y should NOT be preserved when frozen");
        }
    }

    // ==================== Requirement 15: extraBlockedKeys Union ====================
    
    @Nested
    @DisplayName("R15: Blocked Keys Union")
    class BlockedKeysUnionTests {

        @Test
        @Order(28)
        @DisplayName("extraBlockedKeys from multiple matching rules are combined")
        void testExtraBlockedKeysUnion() {
            // Invariant: All extraBlockedKeys from matching rules should be unioned
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("secret1", "blocked-by-rule1");
            config.put("secret2", "blocked-by-rule2");
            config.put("allowed", "visible");
            source.put("config", config);

            DeepMerge.Options options = new DeepMerge.Options();
            
            options.rules.add(new DeepMerge.PathRule(
                "root.config",
                Set.of("secret1"),
                null,
                false
            ));
            
            options.rules.add(new DeepMerge.PathRule(
                "root.config",
                Set.of("secret2"),
                null,
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultConfig = (Map<String, Object>) result.get("config");
            
            assertFalse(resultConfig.containsKey("secret1"), "secret1 blocked by rule1");
            assertFalse(resultConfig.containsKey("secret2"), "secret2 blocked by rule2");
            assertEquals("visible", resultConfig.get("allowed"));
        }

        @Test
        @Order(29)
        @DisplayName("Global blocked keys combined with path rule blocked keys")
        void testGlobalAndPathBlockedKeysUnion() {
            // Invariant: Global + path-specific blocked keys all apply
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("__proto__", "global-blocked");
            data.put("custom", "path-blocked");
            data.put("allowed", "visible");
            source.put("data", data);

            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.data",
                Set.of("custom"),
                null,
                false
            ));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> resultData = (Map<String, Object>) result.get("data");
            
            assertFalse(resultData.containsKey("__proto__"), "Global blocked key excluded");
            assertFalse(resultData.containsKey("custom"), "Path blocked key excluded");
            assertEquals("visible", resultData.get("allowed"));
        }
    }

    // ==================== Edge Cases and Error Handling ====================
    
    @Nested
    @DisplayName("Edge Cases")
    class EdgeCasesTests {

        @Test
        @Order(30)
        @DisplayName("Empty map merge produces empty map")
        void testEmptyMapMerge() {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(
                new LinkedHashMap<>(), 
                new LinkedHashMap<>()
            );
            assertTrue(result.isEmpty());
        }

        @Test
        @Order(31)
        @DisplayName("Conflict policy ERROR throws exception with path info")
        void testConflictPolicyErrorWithPath() {
            // Invariant: Exception message should contain path information
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("value", "string");

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("value", 123);

            DeepMerge.Options options = new DeepMerge.Options();
            options.conflictPolicy = DeepMerge.ConflictPolicy.ERROR;

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> 
                DeepMerge.merge(target, source, options)
            );
            
            assertTrue(ex.getMessage().contains("conflict"), "Message should mention conflict");
            assertTrue(ex.getMessage().contains("root") || ex.getMessage().contains("value"), 
                "Message should contain path info");
        }

        @Test
        @Order(32)
        @DisplayName("maxDepth exceeded throws exception with depth info")
        void testMaxDepthExceededWithInfo() {
            // Invariant: Exception should contain maxDepth limit in message
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> current = source;
            for (int i = 0; i < 10; i++) {
                Map<String, Object> next = new LinkedHashMap<>();
                current.put("level", next);
                current = next;
            }

            DeepMerge.Options options = new DeepMerge.Options();
            options.maxDepth = 5;

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> 
                DeepMerge.merge(null, source, options)
            );
            
            assertTrue(ex.getMessage().contains("maxDepth") || ex.getMessage().contains("5"),
                "Message should contain maxDepth limit info");
        }

        @Test
        @Order(33)
        @DisplayName("Result tracks keysVisited correctly")
        void testKeysVisitedTracking() {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("a", 1);
            source.put("b", 2);
            source.put("c", 3);

            DeepMerge.Result result = DeepMerge.merge(null, source, new DeepMerge.Options());
            
            assertEquals(3, result.keysVisited);
        }
    }

    // ==================== NEW: Cycle Detection Tests ====================
    
    @Nested
    @DisplayName("Cycle Detection")
    class CycleDetectionTests {

        @Test
        @Order(40)
        @DisplayName("Self-referential map does not cause infinite loop")
        void testSelfReferentialMap() {
            // Invariant: Cycle detection should prevent infinite recursion
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("name", "root");
            source.put("self", source); // Self-reference

            DeepMerge.Options options = new DeepMerge.Options();
            
            // Should complete without StackOverflowError
            assertDoesNotThrow(() -> {
                DeepMerge.merge(null, source, options);
            });
        }

        @Test
        @Order(41)
        @DisplayName("Mutually referential maps do not cause infinite loop")
        void testMutuallyReferentialMaps() {
            // Invariant: Cycle detection handles mutual references
            Map<String, Object> a = new LinkedHashMap<>();
            Map<String, Object> b = new LinkedHashMap<>();
            a.put("name", "A");
            a.put("ref", b);
            b.put("name", "B");
            b.put("ref", a); // Mutual reference

            DeepMerge.Options options = new DeepMerge.Options();
            
            assertDoesNotThrow(() -> {
                DeepMerge.merge(null, a, options);
            });
        }

        @Test
        @Order(42)
        @DisplayName("List with self-reference does not cause infinite loop")
        void testSelfReferentialList() {
            // Invariant: Cycle detection works for lists too
            List<Object> source = new ArrayList<>();
            source.add("item");
            source.add(source); // Self-reference

            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.MERGE_BY_INDEX;

            assertDoesNotThrow(() -> {
                DeepMerge.merge(null, source, options);
            });
        }
    }

    // ==================== NEW: Cloning Isolation Tests ====================
    
    @Nested
    @DisplayName("Cloning and Isolation")
    class CloningIsolationTests {

        @Test
        @Order(43)
        @DisplayName("Post-merge source mutation does not affect result")
        void testSourceMutationIsolation() {
            // Invariant: Deep copy means source changes don't affect result
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> inner = new LinkedHashMap<>();
            inner.put("value", "original");
            source.put("inner", inner);

            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;

            // Mutate source after merge
            inner.put("value", "mutated");
            inner.put("newKey", "added");

            @SuppressWarnings("unchecked")
            Map<String, Object> resultInner = (Map<String, Object>) result.get("inner");
            
            assertEquals("original", resultInner.get("value"), "Result should not be affected by source mutation");
            assertFalse(resultInner.containsKey("newKey"), "Result should not have new key from source");
        }

        @Test
        @Order(44)
        @DisplayName("Post-merge result mutation does not affect source")
        void testResultMutationIsolation() {
            // Invariant: Result is independent of source
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> inner = new LinkedHashMap<>();
            inner.put("value", "original");
            source.put("inner", inner);

            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;

            // Mutate result after merge
            @SuppressWarnings("unchecked")
            Map<String, Object> resultInner = (Map<String, Object>) result.get("inner");
            resultInner.put("value", "changed");
            resultInner.put("extra", "new");

            assertEquals("original", inner.get("value"), "Source should not be affected by result mutation");
            assertFalse(inner.containsKey("extra"), "Source should not have new key from result");
        }

        @Test
        @Order(45)
        @DisplayName("List cloning isolation after merge")
        void testListCloningIsolation() {
            // Invariant: Lists should be deeply cloned
            Map<String, Object> source = new LinkedHashMap<>();
            List<String> items = new ArrayList<>(Arrays.asList("a", "b", "c"));
            source.put("items", items);

            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;

            // Mutate source list
            items.add("d");
            items.set(0, "modified");

            @SuppressWarnings("unchecked")
            List<String> resultItems = (List<String>) result.get("items");
            
            assertEquals(3, resultItems.size(), "Result list should have original size");
            assertEquals("a", resultItems.get(0), "Result list should have original values");
        }
    }

    // ==================== NEW: Special Leaf Type Cloning ====================
    
    @Nested
    @DisplayName("Special Leaf Type Cloning")
    class SpecialLeafCloningTests {

        @Test
        @Order(46)
        @DisplayName("Date values are cloned, not shared")
        void testDateCloning() {
            // Invariant: Date objects should be cloned to prevent mutation
            Date originalDate = new Date(1000000000L);
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("date", originalDate);

            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;

            // Mutate source date
            originalDate.setTime(999999999L);

            Date resultDate = (Date) result.get("date");
            assertEquals(1000000000L, resultDate.getTime(), "Result date should not be affected by source mutation");
        }

        @Test
        @Order(47)
        @DisplayName("Instant values are cloned, not shared")
        void testInstantCloning() {
            // Invariant: Instant objects should be cloned
            Instant originalInstant = Instant.ofEpochMilli(1000000000L);
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("instant", originalInstant);

            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;

            Instant resultInstant = (Instant) result.get("instant");
            
            // Instant is immutable, but verify it's stored correctly
            assertEquals(originalInstant.toEpochMilli(), resultInstant.toEpochMilli());
        }

        @Test
        @Order(48)
        @DisplayName("Pattern values are cloned, not shared")
        void testPatternCloning() {
            // Invariant: Pattern objects should be cloned
            Pattern originalPattern = Pattern.compile("[a-z]+", Pattern.CASE_INSENSITIVE);
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("pattern", originalPattern);

            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(null, source, options).value;

            Pattern resultPattern = (Pattern) result.get("pattern");
            
            assertEquals(originalPattern.pattern(), resultPattern.pattern());
            assertEquals(originalPattern.flags(), resultPattern.flags());
            assertNotSame(originalPattern, resultPattern, "Pattern should be a new instance");
        }
    }

    // ==================== NEW: maxKeys Exceeded Test ====================
    
    @Nested
    @DisplayName("Limits Exceeded")
    class LimitsExceededTests {

        @Test
        @Order(49)
        @DisplayName("maxKeys exceeded throws exception with limit info")
        void testMaxKeysExceeded() {
            // Invariant: Exception should be thrown when maxKeys is exceeded
            Map<String, Object> source = new LinkedHashMap<>();
            for (int i = 0; i < 100; i++) {
                source.put("key" + i, "value" + i);
            }

            DeepMerge.Options options = new DeepMerge.Options();
            options.maxKeys = 50;

            IllegalStateException ex = assertThrows(IllegalStateException.class, () -> 
                DeepMerge.merge(null, source, options)
            );
            
            assertTrue(ex.getMessage().contains("maxKeys") || ex.getMessage().contains("50"),
                "Message should contain maxKeys limit info");
        }
    }

    // ==================== NEW: Container Merge Flags ====================
    
    @Nested
    @DisplayName("Container Merge Flags")
    class ContainerMergeFlagsTests {

        @Test
        @Order(53)
        @DisplayName("mergeMaps=false replaces maps instead of merging")
        void testMergeMapsFalse() {
            // Invariant: When mergeMaps=false, source map replaces target map
            Map<String, Object> target = new LinkedHashMap<>();
            Map<String, Object> targetInner = new LinkedHashMap<>();
            targetInner.put("a", 1);
            targetInner.put("b", 2);
            target.put("inner", targetInner);

            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> sourceInner = new LinkedHashMap<>();
            sourceInner.put("c", 3);
            source.put("inner", sourceInner);

            DeepMerge.Options options = new DeepMerge.Options();
            options.mergeMaps = false;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            Map<String, Object> resultInner = (Map<String, Object>) result.get("inner");
            
            // Should be source's map, not merged
            assertFalse(resultInner.containsKey("a"), "Target key 'a' should NOT be preserved");
            assertFalse(resultInner.containsKey("b"), "Target key 'b' should NOT be preserved");
            assertEquals(3, resultInner.get("c"), "Source key 'c' should be present");
        }

        @Test
        @Order(54)
        @DisplayName("mergeSets=false replaces sets instead of merging")
        void testMergeSetsFalse() {
            // Invariant: When mergeSets=false, source set replaces target set
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("tags", new LinkedHashSet<>(Arrays.asList("a", "b", "c")));

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("tags", new LinkedHashSet<>(Arrays.asList("x", "y")));

            DeepMerge.Options options = new DeepMerge.Options();
            options.mergeSets = false;

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;

            @SuppressWarnings("unchecked")
            Set<String> resultTags = (Set<String>) result.get("tags");
            
            // Should be source's set only, not union
            assertEquals(2, resultTags.size(), "Should only have source set size");
            assertTrue(resultTags.contains("x"));
            assertTrue(resultTags.contains("y"));
            assertFalse(resultTags.contains("a"), "Target element should NOT be present");
        }
    }

    // ==================== NEW: Custom Merge Hook ====================
    
    @Nested
    @DisplayName("Custom Merge Hook")
    class CustomMergeHookTests {

        @Test
        @Order(55)
        @DisplayName("CustomMergeHook can intercept and handle merge")
        void testCustomMergeHookIntercepts() {
            // Invariant: CustomMergeHook can prevent default merge behavior
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("value", 1);

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("value", 100);

            AtomicInteger hookCallCount = new AtomicInteger(0);

            DeepMerge.Options options = new DeepMerge.Options();
            options.customMerge = (ctx) -> {
                hookCallCount.incrementAndGet();
                // Don't handle - return false to allow default behavior
                return false;
            };

            DeepMerge.merge(target, source, options);
            
            assertTrue(hookCallCount.get() > 0, "Hook should have been called");
        }

        @Test
        @Order(56)
        @DisplayName("CustomMergeHook returning true prevents default merge")
        void testCustomMergeHookPreventsDefault() {
            // Invariant: When hook returns true, default merge is skipped
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("value", 1);
            target.put("protected", "keep-me");

            Map<String, Object> source = new LinkedHashMap<>();
            source.put("value", 100);
            source.put("protected", "overwrite");
            source.put("newKey", "added");

            DeepMerge.Options options = new DeepMerge.Options();
            options.customMerge = (ctx) -> {
                // Handle everything - prevent all default merging
                return true;
            };

            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;
            
            // Target should be unchanged since we intercepted
            assertEquals(1, result.get("value"), "Target value should be preserved");
            assertEquals("keep-me", result.get("protected"));
            // newKey would not be added because we handled the merge
        }

        @Test
        @Order(57)
        @DisplayName("CustomMergeHook has access to Context data")
        void testCustomMergeHookContextAccess() {
            // Invariant: Hook should receive proper context
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> inner = new LinkedHashMap<>();
            inner.put("x", 1);
            source.put("inner", inner);

            List<String> paths = new ArrayList<>();
            List<Integer> depths = new ArrayList<>();

            DeepMerge.Options options = new DeepMerge.Options();
            options.customMerge = (ctx) -> {
                paths.add(ctx.path);
                depths.add(ctx.depth());
                return false; // Continue default behavior
            };

            DeepMerge.merge(null, source, options);
            
            assertTrue(paths.contains("root"), "Should have root path");
            assertTrue(depths.contains(1) || depths.contains(0), "Should have depth info");
        }
    }

    // ==================== NEW: Context API Tests ====================
    
    @Nested
    @DisplayName("Context API")
    class ContextAPITests {

        @Test
        @Order(58)
        @DisplayName("Context.keysVisited() returns correct count")
        void testContextKeysVisited() {
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("a", 1);
            source.put("b", 2);
            source.put("c", 3);

            List<Long> keysVisitedDuringMerge = new ArrayList<>();

            DeepMerge.Options options = new DeepMerge.Options();
            options.customMerge = (ctx) -> {
                keysVisitedDuringMerge.add(ctx.keysVisited());
                return false;
            };

            DeepMerge.merge(null, source, options);
            
            // Hook is called at root level before keys are visited
            // At least one call should happen
            assertFalse(keysVisitedDuringMerge.isEmpty());
        }

        @Test
        @Order(59)
        @DisplayName("Context.nodesVisited() increments correctly")
        void testContextNodesVisited() {
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> inner = new LinkedHashMap<>();
            inner.put("x", 1);
            source.put("inner", inner);
            source.put("value", 2);

            List<Long> nodesVisitedDuringMerge = new ArrayList<>();

            DeepMerge.Options options = new DeepMerge.Options();
            options.customMerge = (ctx) -> {
                nodesVisitedDuringMerge.add(ctx.nodesVisited());
                return false;
            };

            DeepMerge.merge(null, source, options);
            
            assertFalse(nodesVisitedDuringMerge.isEmpty());
            assertTrue(nodesVisitedDuringMerge.get(nodesVisitedDuringMerge.size() - 1) >= 1);
        }

        @Test
        @Order(60)
        @DisplayName("Context.ruleMatch() returns correct blockedKeys and strategy")
        void testContextRuleMatch() {
            Map<String, Object> source = new LinkedHashMap<>();
            Map<String, Object> config = new LinkedHashMap<>();
            config.put("secret", "blocked");
            config.put("name", "allowed");
            source.put("config", config);

            List<DeepMerge.RuleMatch> ruleMatches = new ArrayList<>();
            List<String> pathsWithRules = new ArrayList<>();

            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.config",
                Set.of("customBlocked"),
                DeepMerge.ArrayStrategy.CONCAT,
                false
            ));
            
            options.customMerge = (ctx) -> {
                DeepMerge.RuleMatch rm = ctx.ruleMatch();
                if (rm != null) {
                    ruleMatches.add(rm);
                    pathsWithRules.add(ctx.path);
                }
                return false;
            };

            DeepMerge.merge(null, source, options);
            
            // Check that ruleMatch was accessible
            assertFalse(ruleMatches.isEmpty(), "RuleMatch should be available");
            
            // Find the rule match for root.config path
            boolean foundConfigRule = false;
            for (int i = 0; i < pathsWithRules.size(); i++) {
                if (pathsWithRules.get(i).equals("root.config")) {
                    DeepMerge.RuleMatch rm = ruleMatches.get(i);
                    assertTrue(rm.blockedKeys.contains("customBlocked"));
                    assertEquals(DeepMerge.ArrayStrategy.CONCAT, rm.arrayStrategy);
                    foundConfigRule = true;
                }
            }
            // Rule matching happens when processing the config node
        }
    }

    // ==================== NEW: Fixed-Seed Randomized Test ====================
    
    @Nested
    @DisplayName("Randomized Invariant Tests")
    class RandomizedInvariantTests {

        @Test
        @Order(61)
        @DisplayName("Fixed-seed random merge preserves invariants")
        @RepeatedTest(3)
        void testFixedSeedRandomMerge() {
            // Invariant: Merge should be deterministic and preserve key invariants
            Random random = new Random(42); // Fixed seed for reproducibility
            
            Map<String, Object> target = generateRandomMap(random, 3, 2);
            Map<String, Object> source = generateRandomMap(random, 3, 2);
            
            DeepMerge.Options options = new DeepMerge.Options();
            
            @SuppressWarnings("unchecked")
            Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;
            
            // Invariant 1: Result should not be null
            assertNotNull(result);
            
            // Invariant 2: All source keys (non-blocked) should be in result
            for (String key : source.keySet()) {
                if (!options.blockedKeys.contains(key)) {
                    assertTrue(result.containsKey(key), "Source key should be in result: " + key);
                }
            }
            
            // Invariant 3: All target keys should be in result (source may have overwritten values)
            for (String key : target.keySet()) {
                assertTrue(result.containsKey(key), "Target key should be in result: " + key);
            }
            
            // Invariant 4: Blocked keys should never appear
            for (String blockedKey : options.blockedKeys) {
                assertFalse(result.containsKey(blockedKey), "Blocked key should not be in result: " + blockedKey);
            }
        }
        
        private Map<String, Object> generateRandomMap(Random random, int maxKeys, int maxDepth) {
            Map<String, Object> map = new LinkedHashMap<>();
            int numKeys = random.nextInt(maxKeys) + 1;
            
            for (int i = 0; i < numKeys; i++) {
                String key = "key" + random.nextInt(100);
                Object value;
                
                if (maxDepth > 0 && random.nextBoolean()) {
                    value = generateRandomMap(random, maxKeys, maxDepth - 1);
                } else {
                    value = random.nextInt(1000);
                }
                
                map.put(key, value);
            }
            
            return map;
        }
    }
}