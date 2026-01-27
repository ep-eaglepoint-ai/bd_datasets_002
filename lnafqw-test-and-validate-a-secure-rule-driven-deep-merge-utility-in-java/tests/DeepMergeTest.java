import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

/**
 * Comprehensive test suite for DeepMerge utility.
 * Tests all requirements for deep merging with security and configurability.
 */
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class DeepMergeTest {

    // ==================== Requirement 6: Deep Merging of Map, List, Set, Arrays ====================

    @Test
    @Order(1)
    @DisplayName("R6: Deep merge of nested Maps preserves structure and merges values")
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
    @DisplayName("R6: Deep merge of List with REPLACE strategy replaces entire list")
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
    @DisplayName("R6: Deep merge of List with CONCAT strategy appends source to target")
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
    @DisplayName("R6: Deep merge of List with MERGE_BY_INDEX strategy merges by position")
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
    @DisplayName("R6: Deep merge of Set unions elements from both sets")
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
    @DisplayName("R6: Deep merge of arrays works correctly")
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

    // ==================== Requirement 7: Null Handling ====================

    @Test
    @Order(7)
    @DisplayName("R7: When target is null, source becomes result")
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
    @DisplayName("R7: When source is null with SOURCE_WINS policy, result is null")
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
    @DisplayName("R7: When source is null with TARGET_WINS policy, target is preserved")
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
    @DisplayName("R7: When both non-null, deep merge occurs")
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

    // ==================== Requirement 8: Non-Conflicting Target Data Preserved ====================

    @Test
    @Order(11)
    @DisplayName("R8: Non-conflicting target keys are preserved after merge")
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
    @DisplayName("R8: Nested non-conflicting target data is preserved")
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

    // ==================== Requirement 9: Global Blocked Keys ====================

    @Test
    @Order(13)
    @DisplayName("R9: __proto__ key is excluded from merge")
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
    @DisplayName("R9: constructor key is excluded from merge")
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
    @DisplayName("R9: prototype key is excluded from merge")
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
    @DisplayName("R9: @type key is excluded from merge")
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
    @DisplayName("R9: class key is excluded from merge")
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

    // ==================== Requirement 10: Blocked Keys at Deep Nesting ====================

    @Test
    @Order(18)
    @DisplayName("R10: Blocked keys are excluded at level 2 nesting")
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
    @DisplayName("R10: Blocked keys are excluded at level 5 nesting")
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

    // ==================== Requirement 11: Path-Based Blocked Keys ====================

    @Test
    @Order(20)
    @DisplayName("R11: Path-based blocked key only applies to matching path")
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
    @DisplayName("R11: Path-based blocked key with wildcard matches multiple paths")
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

    // ==================== Requirement 12: protectKeys = false ====================

    @Test
    @Order(22)
    @DisplayName("R12: Blocked keys ARE merged when protectKeys = false")
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
    @DisplayName("R12: Nested blocked keys are merged when protectKeys = false")
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

    // ==================== Requirement 13: Non-String Keys Not Blocked ====================

    @Test
    @Order(24)
    @DisplayName("R13: Integer keys are not affected by blocked key rules")
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
    @DisplayName("R13: Object keys that look like blocked keys are not blocked")
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

    // ==================== Requirement 14: Rule Precedence (Last Wins) ====================

    @Test
    @Order(26)
    @DisplayName("R14: Last matching rule's arrayStrategy overrides previous")
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
    @DisplayName("R14: Last matching rule's freezeSubtree takes precedence")
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
            true
        ));

        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) DeepMerge.merge(target, source, options).value;
        
        @SuppressWarnings("unchecked")
        Map<String, Object> resultData = (Map<String, Object>) result.get("data");
        
        assertEquals(100, resultData.get("a"));
        assertEquals(2, resultData.get("b"));
    }

    // ==================== Requirement 15: extraBlockedKeys Union ====================

    @Test
    @Order(28)
    @DisplayName("R15: extraBlockedKeys from multiple matching rules are combined")
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
    @DisplayName("R15: Global blocked keys combined with path rule blocked keys")
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

    // ==================== Additional Edge Cases ====================

    @Test
    @Order(30)
    @DisplayName("Edge: Empty map merge produces empty map")
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
    @DisplayName("Edge: Conflict policy ERROR throws exception")
    void testConflictPolicyError() {
        Map<String, Object> target = new LinkedHashMap<>();
        target.put("value", "string");

        Map<String, Object> source = new LinkedHashMap<>();
        source.put("value", 123);

        DeepMerge.Options options = new DeepMerge.Options();
        options.conflictPolicy = DeepMerge.ConflictPolicy.ERROR;

        assertThrows(IllegalStateException.class, () -> 
            DeepMerge.merge(target, source, options)
        );
    }

    @Test
    @Order(32)
    @DisplayName("Edge: maxDepth exceeded throws exception")
    void testMaxDepthExceeded() {
        Map<String, Object> source = new LinkedHashMap<>();
        Map<String, Object> current = source;
        for (int i = 0; i < 10; i++) {
            Map<String, Object> next = new LinkedHashMap<>();
            current.put("level", next);
            current = next;
        }

        DeepMerge.Options options = new DeepMerge.Options();
        options.maxDepth = 5;

        assertThrows(IllegalStateException.class, () -> 
            DeepMerge.merge(null, source, options)
        );
    }

    @Test
    @Order(33)
    @DisplayName("Edge: Result tracks keysVisited correctly")
    void testKeysVisitedTracking() {
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("a", 1);
        source.put("b", 2);
        source.put("c", 3);

        DeepMerge.Result result = DeepMerge.merge(null, source, new DeepMerge.Options());
        
        assertEquals(3, result.keysVisited);
    }

    @Test
    @Order(34)
    @DisplayName("Edge: SKIP null policy preserves target when source value is null")
    void testNullPolicySkip() {
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

    @Test
    @Order(35)
    @DisplayName("Edge: Double-star glob matches any depth")
    void testDoubleStarGlob() {
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
}