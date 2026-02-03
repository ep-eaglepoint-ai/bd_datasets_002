import org.junit.jupiter.api.*;
import java.lang.reflect.Array;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Comprehensive JUnit 5 Test Suite for DeepMerge Utility.
 * All tests are deterministic with no flaky behavior.
 */
@DisplayName("DeepMerge Test Suite")
public class DeepMergeTest {

    // ============================================================
    // REQUIREMENT 6: Verify deep merging of Map, List, Set, and arrays
    // ============================================================
    @Nested
    @DisplayName("Requirement 6: Deep Merging of Collections")
    class DeepMergingCollectionsTest {

        @Test
        @DisplayName("Should deep merge nested Maps correctly")
        void shouldDeepMergeNestedMaps() {
            // Invariant: Nested maps are recursively merged, not replaced
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("level1", new LinkedHashMap<>(Map.of("a", 1, "b", 2)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("level1", new LinkedHashMap<>(Map.of("b", 20, "c", 3)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> level1 = (Map<String, Object>) merged.get("level1");
            
            assertEquals(1, level1.get("a"), "Original target key 'a' should be preserved");
            assertEquals(20, level1.get("b"), "Key 'b' should be overwritten by source");
            assertEquals(3, level1.get("c"), "New source key 'c' should be added");
        }

        @Test
        @DisplayName("Should merge Lists with REPLACE strategy")
        void shouldMergeListsWithReplaceStrategy() {
            // Invariant: REPLACE clears target and uses source list
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2, 3)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(4, 5)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Integer> items = (List<Integer>) merged.get("items");
            
            assertEquals(Arrays.asList(4, 5), items);
        }

        @Test
        @DisplayName("Should merge Lists with CONCAT strategy")
        void shouldMergeListsWithConcatStrategy() {
            // Invariant: CONCAT appends source elements to target list
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(1, 2, 3)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(4, 5)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.CONCAT;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Integer> items = (List<Integer>) merged.get("items");
            
            assertEquals(Arrays.asList(1, 2, 3, 4, 5), items);
        }

        @Test
        @DisplayName("Should merge Lists with MERGE_BY_INDEX strategy")
        void shouldMergeListsWithMergeByIndexStrategy() {
            // Invariant: MERGE_BY_INDEX merges elements at corresponding indices
            Map<String, Object> targetNested = new LinkedHashMap<>(Map.of("x", 1));
            Map<String, Object> sourceNested = new LinkedHashMap<>(Map.of("y", 2));
            
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(targetNested, "keep")));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(sourceNested, "replace", "new")));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.MERGE_BY_INDEX;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Object> items = (List<Object>) merged.get("items");
            
            assertEquals(3, items.size());
            @SuppressWarnings("unchecked")
            Map<String, Object> firstItem = (Map<String, Object>) items.get(0);
            assertEquals(1, firstItem.get("x"));
            assertEquals(2, firstItem.get("y"));
        }

        @Test
        @DisplayName("Should merge Sets correctly")
        void shouldMergeSetsCorrectly() {
            // Invariant: Sets are unioned when mergeSets=true
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("tags", new LinkedHashSet<>(Arrays.asList("a", "b")));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("tags", new LinkedHashSet<>(Arrays.asList("b", "c")));
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Set<String> tags = (Set<String>) merged.get("tags");
            
            assertTrue(tags.containsAll(Arrays.asList("a", "b", "c")));
        }

        @Test
        @DisplayName("Should merge arrays correctly")
        void shouldMergeArraysCorrectly() {
            // Invariant: Arrays are merged according to strategy
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("data", new Integer[]{1, 2, 3});
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("data", new Integer[]{4, 5});
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.REPLACE;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            Object data = merged.get("data");
            
            assertTrue(data.getClass().isArray());
            assertEquals(2, Array.getLength(data));
        }

        @Test
        @DisplayName("Should handle deeply nested structures")
        void shouldHandleDeeplyNestedStructures() {
            // Invariant: Merge works at arbitrary depth levels
            Map<String, Object> l3Target = new LinkedHashMap<>(Map.of("deep", "target"));
            Map<String, Object> l2Target = new LinkedHashMap<>();
            l2Target.put("l3", l3Target);
            Map<String, Object> l1Target = new LinkedHashMap<>();
            l1Target.put("l2", l2Target);
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("l1", l1Target);
            
            Map<String, Object> l3Source = new LinkedHashMap<>(Map.of("deep", "source", "extra", "val"));
            Map<String, Object> l2Source = new LinkedHashMap<>();
            l2Source.put("l3", l3Source);
            Map<String, Object> l1Source = new LinkedHashMap<>();
            l1Source.put("l2", l2Source);
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("l1", l1Source);
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> deep = (Map<String, Object>) 
                ((Map<String, Object>)((Map<String, Object>)merged.get("l1")).get("l2")).get("l3");
            
            assertEquals("source", deep.get("deep"));
            assertEquals("val", deep.get("extra"));
        }
    }

    // ============================================================
    // REQUIREMENT 7: Verify null handling
    // ============================================================
    @Nested
    @DisplayName("Requirement 7: Null Handling")
    class NullHandlingTest {

        @Test
        @DisplayName("Should handle null target")
        void shouldHandleNullTarget() {
            // Invariant: Null target creates new container from source
            Map<String, Object> source = new LinkedHashMap<>(Map.of("key", "value"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            assertNotNull(result.value);
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertEquals("value", merged.get("key"));
        }

        @Test
        @DisplayName("Should handle null source with SOURCE_WINS")
        void shouldHandleNullSourceWithSourceWins() {
            // Invariant: SOURCE_WINS returns null when source is null
            Map<String, Object> target = new LinkedHashMap<>(Map.of("key", "value"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.SOURCE_WINS;
            DeepMerge.Result result = DeepMerge.merge(target, null, options);
            
            assertNull(result.value);
        }

        @Test
        @DisplayName("Should handle null source with TARGET_WINS")
        void shouldHandleNullSourceWithTargetWins() {
            // Invariant: TARGET_WINS preserves target when source is null
            Map<String, Object> target = new LinkedHashMap<>(Map.of("key", "value"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.TARGET_WINS;
            DeepMerge.Result result = DeepMerge.merge(target, null, options);
            
            assertNotNull(result.value);
        }

        @Test
        @DisplayName("Should handle null source with SKIP policy")
        void shouldHandleNullSourceWithSkip() {
            // Invariant: SKIP preserves target when source is null
            Map<String, Object> target = new LinkedHashMap<>(Map.of("key", "value"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.SKIP;
            DeepMerge.Result result = DeepMerge.merge(target, null, options);
            
            assertNotNull(result.value);
        }

        @Test
        @DisplayName("Should handle null values within maps")
        void shouldHandleNullValuesWithinMaps() {
            // Invariant: Null values in source handled by nullPolicy
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("key", "original");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("key", null);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.nullPolicy = DeepMerge.NullPolicy.SOURCE_WINS;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertNull(merged.get("key"));
        }

        @Test
        @DisplayName("Should merge when both non-null")
        void shouldMergeWhenBothNonNull() {
            // Invariant: Both non-null values merged properly
            Map<String, Object> target = new LinkedHashMap<>(Map.of("a", 1));
            Map<String, Object> source = new LinkedHashMap<>(Map.of("b", 2));
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertEquals(1, merged.get("a"));
            assertEquals(2, merged.get("b"));
        }
    }

    // ============================================================
    // REQUIREMENT 8: Verify target data preservation
    // ============================================================
    @Nested
    @DisplayName("Requirement 8: Target Data Preservation")
    class TargetDataPreservationTest {

        @Test
        @DisplayName("Should preserve target keys not in source")
        void shouldPreserveTargetKeysNotInSource() {
            // Invariant: Keys only in target are preserved
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("targetOnly", "preserved");
            target.put("shared", "target");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("shared", "source");
            source.put("sourceOnly", "added");
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            assertEquals("preserved", merged.get("targetOnly"));
            assertEquals("source", merged.get("shared"));
            assertEquals("added", merged.get("sourceOnly"));
        }

        @Test
        @DisplayName("Should preserve nested target data")
        void shouldPreserveNestedTargetData() {
            // Invariant: Nested target data not in source preserved
            Map<String, Object> targetNested = new LinkedHashMap<>();
            targetNested.put("keep", "this");
            targetNested.put("overwrite", "target");
            
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("nested", targetNested);
            
            Map<String, Object> sourceNested = new LinkedHashMap<>();
            sourceNested.put("overwrite", "source");
            sourceNested.put("add", "new");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("nested", sourceNested);
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> nestedMerged = (Map<String, Object>) merged.get("nested");
            
            assertEquals("this", nestedMerged.get("keep"));
            assertEquals("source", nestedMerged.get("overwrite"));
            assertEquals("new", nestedMerged.get("add"));
        }

        @Test
        @DisplayName("Should preserve with TARGET_WINS policy")
        void shouldPreserveWithTargetWinsPolicy() {
            // Invariant: TARGET_WINS preserves target on conflict
            Map<String, Object> target = new LinkedHashMap<>(Map.of("key", "target"));
            Map<String, Object> source = new LinkedHashMap<>(Map.of("key", "source"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.conflictPolicy = DeepMerge.ConflictPolicy.TARGET_WINS;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertEquals("target", merged.get("key"));
        }
    }

    // ============================================================
    // REQUIREMENT 9: Verify global blocked keys
    // ============================================================
    @Nested
    @DisplayName("Requirement 9: Global Blocked Keys")
    class GlobalBlockedKeysTest {

        @Test
        @DisplayName("Should exclude __proto__ key")
        void shouldExcludeProtoKey() {
            // Invariant: __proto__ is blocked when protectKeys=true
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "malicious");
            source.put("safe", "value");
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            assertFalse(merged.containsKey("__proto__"));
            assertEquals("value", merged.get("safe"));
        }

        @Test
        @DisplayName("Should exclude constructor key")
        void shouldExcludeConstructorKey() {
            // Invariant: constructor is blocked
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("constructor", "malicious");
            source.put("valid", "data");
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            assertFalse(merged.containsKey("constructor"));
            assertTrue(merged.containsKey("valid"));
        }

        @Test
        @DisplayName("Should exclude all default blocked keys")
        void shouldExcludeAllDefaultBlockedKeys() {
            // Invariant: All default blocked keys are filtered
            List<String> blockedKeys = Arrays.asList(
                "__proto__", "prototype", "constructor", "@type", "$type", "class", "@class"
            );
            
            Map<String, Object> source = new LinkedHashMap<>();
            for (String key : blockedKeys) {
                source.put(key, "blocked");
            }
            source.put("allowed", "value");
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            for (String key : blockedKeys) {
                assertFalse(merged.containsKey(key), key + " should be blocked");
            }
            assertEquals("value", merged.get("allowed"));
        }
    }

    // ============================================================
    // REQUIREMENT 10: Verify blocked keys at deep nesting
    // ============================================================
    @Nested
    @DisplayName("Requirement 10: Deep Nested Blocked Keys")
    class DeepNestedBlockedKeysTest {

        @Test
        @DisplayName("Should exclude blocked keys at level 2")
        void shouldExcludeBlockedKeysAtLevel2() {
            // Invariant: Blocked keys filtered at any depth
            Map<String, Object> nested = new LinkedHashMap<>();
            nested.put("__proto__", "blocked");
            nested.put("valid", "data");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("level1", nested);
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> level1 = (Map<String, Object>) merged.get("level1");
            
            assertFalse(level1.containsKey("__proto__"));
            assertEquals("data", level1.get("valid"));
        }

        @Test
        @DisplayName("Should exclude blocked keys at level 3")
        void shouldExcludeBlockedKeysAtLevel3() {
            // Invariant: Blocked keys filtered at level 3+
            Map<String, Object> l3 = new LinkedHashMap<>();
            l3.put("constructor", "bad");
            l3.put("ok", "good");
            
            Map<String, Object> l2 = new LinkedHashMap<>();
            l2.put("l3", l3);
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("l2", l2);
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> deep = (Map<String, Object>) 
                ((Map<String, Object>)merged.get("l2")).get("l3");
            
            assertFalse(deep.containsKey("constructor"));
            assertEquals("good", deep.get("ok"));
        }

        @Test
        @DisplayName("Should exclude blocked keys inside list elements")
        void shouldExcludeBlockedKeysInsideListElements() {
            // Invariant: Blocked keys filtered within list element maps
            Map<String, Object> listItem = new LinkedHashMap<>();
            listItem.put("@type", "Attack");
            listItem.put("name", "item");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(listItem)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.MERGE_BY_INDEX;
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) merged.get("items");
            
            assertFalse(items.get(0).containsKey("@type"));
            assertEquals("item", items.get(0).get("name"));
        }
    }

    // ============================================================
    // REQUIREMENT 11: Path-based blocked keys
    // ============================================================
    @Nested
    @DisplayName("Requirement 11: Path-Based Blocked Keys")
    class PathBasedBlockedKeysTest {

        @Test
        @DisplayName("Should block keys only at matching path")
        void shouldBlockKeysOnlyAtMatchingPath() {
            // Invariant: Path rules only affect matching paths
            Map<String, Object> secrets = new LinkedHashMap<>();
            secrets.put("password", "secret");
            secrets.put("name", "config");
            
            Map<String, Object> other = new LinkedHashMap<>();
            other.put("password", "allowed");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("secrets", secrets);
            source.put("other", other);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.secrets", Set.of("password"), null, false
            ));
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
        @DisplayName("Should support glob wildcard *")
        void shouldSupportSingleWildcard() {
            // Invariant: * matches exactly one path segment
            Map<String, Object> svc1 = new LinkedHashMap<>();
            svc1.put("token", "secret");
            svc1.put("url", "http://s1");
            
            Map<String, Object> svc2 = new LinkedHashMap<>();
            svc2.put("token", "secret2");
            svc2.put("url", "http://s2");
            
            Map<String, Object> services = new LinkedHashMap<>();
            services.put("api", svc1);
            services.put("db", svc2);
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("services", services);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.services.*", Set.of("token"), null, false
            ));
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> svc = (Map<String, Object>) merged.get("services");
            @SuppressWarnings("unchecked")
            Map<String, Object> api = (Map<String, Object>) svc.get("api");
            @SuppressWarnings("unchecked")
            Map<String, Object> db = (Map<String, Object>) svc.get("db");
            
            assertFalse(api.containsKey("token"));
            assertFalse(db.containsKey("token"));
        }

        @Test
        @DisplayName("Should support glob **")
        void shouldSupportDoubleWildcard() {
            // Invariant: ** matches zero or more segments
            Map<String, Object> deep = new LinkedHashMap<>();
            deep.put("secret", "hidden");
            deep.put("public", "visible");
            
            Map<String, Object> l2 = new LinkedHashMap<>();
            l2.put("deep", deep);
            
            Map<String, Object> l1 = new LinkedHashMap<>();
            l1.put("l2", l2);
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("l1", l1);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.**.deep", Set.of("secret"), null, false
            ));
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> d = (Map<String, Object>) 
                ((Map<String, Object>)((Map<String, Object>)merged.get("l1")).get("l2")).get("deep");
            
            assertFalse(d.containsKey("secret"));
            assertEquals("visible", d.get("public"));
        }
    }

    // ============================================================
    // REQUIREMENT 12: protectKeys = false
    // ============================================================
    @Nested
    @DisplayName("Requirement 12: ProtectKeys Disabled")
    class ProtectKeysDisabledTest {

        @Test
        @DisplayName("Should allow __proto__ when protectKeys=false")
        void shouldAllowProtoWhenDisabled() {
            // Invariant: Blocked keys allowed when protectKeys=false
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
        @DisplayName("Should allow all blocked keys when protectKeys=false")
        void shouldAllowAllBlockedKeysWhenDisabled() {
            // Invariant: All normally blocked keys allowed
            List<String> blockedKeys = Arrays.asList(
                "__proto__", "prototype", "constructor", "@type"
            );
            
            Map<String, Object> source = new LinkedHashMap<>();
            for (String key : blockedKeys) {
                source.put(key, "value_" + key);
            }
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.protectKeys = false;
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            for (String key : blockedKeys) {
                assertTrue(merged.containsKey(key));
            }
        }
    }

    // ============================================================
    // REQUIREMENT 13: Non-String keys not blocked
    // ============================================================
    @Nested
    @DisplayName("Requirement 13: Non-String Keys Not Blocked")
    class NonStringKeysTest {

        @Test
        @DisplayName("Should not block Integer keys")
        void shouldNotBlockIntegerKeys() {
            // Invariant: Only String keys subject to blocking
            Map<Object, Object> source = new LinkedHashMap<>();
            source.put(123, "number_key");
            source.put("valid", "string_key");
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<Object, Object> merged = (Map<Object, Object>) result.value;
            
            assertEquals("number_key", merged.get(123));
            assertEquals("string_key", merged.get("valid"));
        }

        @Test
        @DisplayName("Should block String but not non-String keys")
        void shouldDistinguishStringFromNonStringKeys() {
            // Invariant: String "__proto__" blocked, Integer key not
            Map<Object, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "blocked");
            source.put(42, "not_blocked");
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<Object, Object> merged = (Map<Object, Object>) result.value;
            
            assertFalse(merged.containsKey("__proto__"));
            assertEquals("not_blocked", merged.get(42));
        }
    }

    // ============================================================
    // REQUIREMENT 14: Rule precedence
    // ============================================================
    @Nested
    @DisplayName("Requirement 14: Rule Precedence")
    class RulePrecedenceTest {

        @Test
        @DisplayName("Should apply last matching array strategy")
        void shouldApplyLastMatchingArrayStrategy() {
            // Invariant: Later rules override earlier ones
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(10, 20)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(1, 2, 3)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule(
                "root.items", null, DeepMerge.ArrayStrategy.REPLACE, false
            ));
            options.rules.add(new DeepMerge.PathRule(
                "root.items", null, DeepMerge.ArrayStrategy.CONCAT, false
            ));
            
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Integer> items = (List<Integer>) merged.get("items");
            
            assertEquals(5, items.size(), "CONCAT (last rule) should apply");
        }

        @Test
        @DisplayName("Should use global strategy when no rules match")
        void shouldUseGlobalStrategyWhenNoRulesMatch() {
            // Invariant: Global options used when no path rules match
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("items", new ArrayList<>(Arrays.asList(10, 20)));
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("items", new ArrayList<>(Arrays.asList(1, 2)));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.arrayStrategy = DeepMerge.ArrayStrategy.CONCAT;
            options.rules.add(new DeepMerge.PathRule(
                "root.other", null, DeepMerge.ArrayStrategy.REPLACE, false
            ));
            
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            List<Integer> items = (List<Integer>) merged.get("items");
            
            assertEquals(4, items.size(), "Global CONCAT should apply");
        }
    }

    // ============================================================
    // REQUIREMENT 15: ExtraBlockedKeys union
    // ============================================================
    @Nested
    @DisplayName("Requirement 15: ExtraBlockedKeys Union")
    class ExtraBlockedKeysUnionTest {

        @Test
        @DisplayName("Should union extraBlockedKeys from multiple rules")
        void shouldUnionExtraBlockedKeys() {
            // Invariant: Blocked keys from all matching rules combined
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

        @Test
        @DisplayName("Should combine global and path blocked keys")
        void shouldCombineGlobalAndPathBlockedKeys() {
            // Invariant: Global + path blocked keys all applied
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("__proto__", "global");
            source.put("path_blocked", "path");
            source.put("allowed", "visible");
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule("root", Set.of("path_blocked"), null, false));
            
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            
            assertFalse(merged.containsKey("__proto__"));
            assertFalse(merged.containsKey("path_blocked"));
            assertEquals("visible", merged.get("allowed"));
        }
    }

    // ============================================================
    // Cycle Detection Tests
    // ============================================================
    @Nested
    @DisplayName("Cycle Detection")
    class CycleDetectionTest {

        @Test
        @DisplayName("Should handle self-referential Map")
        void shouldHandleSelfReferentialMap() {
            // Invariant: Self-referencing structures don't overflow
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("name", "self");
            source.put("self", source);
            
            DeepMerge.Options options = new DeepMerge.Options();
            
            assertDoesNotThrow(() -> {
                DeepMerge.Result result = DeepMerge.merge(null, source, options);
                assertNotNull(result.value);
            });
        }

        @Test
        @DisplayName("Should handle mutually referential Maps")
        void shouldHandleMutuallyReferentialMaps() {
            // Invariant: Mutual references handled correctly
            Map<String, Object> mapA = new LinkedHashMap<>();
            Map<String, Object> mapB = new LinkedHashMap<>();
            
            mapA.put("name", "A");
            mapA.put("ref", mapB);
            mapB.put("name", "B");
            mapB.put("ref", mapA);
            
            DeepMerge.Options options = new DeepMerge.Options();
            
            assertDoesNotThrow(() -> {
                DeepMerge.Result result = DeepMerge.merge(null, mapA, options);
                assertNotNull(result.value);
            });
        }
    }

    // ============================================================
    // Cloning Tests
    // ============================================================
    @Nested
    @DisplayName("Cloning Behavior")
    class CloningBehaviorTest {

        @Test
        @DisplayName("Should deep clone when enabled")
        void shouldDeepCloneWhenEnabled() {
            // Invariant: Mutations to source after merge don't affect result
            Map<String, Object> nested = new LinkedHashMap<>();
            nested.put("key", "original");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("nested", nested);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            nested.put("key", "mutated");
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> m = (Map<String, Object>) merged.get("nested");
            
            assertEquals("original", m.get("key"));
        }

        @Test
        @DisplayName("Should clone Date objects")
        void shouldCloneDateObjects() {
            // Invariant: Date objects are cloned
            Date date = new Date();
            long originalTime = date.getTime();
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("timestamp", date);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.cloneAssignedValues = true;
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            date.setTime(0);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            Date mergedDate = (Date) merged.get("timestamp");
            
            assertEquals(originalTime, mergedDate.getTime());
        }
    }

    // ============================================================
    // Conflict Policy Tests
    // ============================================================
    @Nested
    @DisplayName("Conflict Policy")
    class ConflictPolicyTest {

        @Test
        @DisplayName("Should throw on conflict with ERROR policy")
        void shouldThrowOnConflictWithErrorPolicy() {
            // Invariant: ERROR policy throws on leaf conflicts
            Map<String, Object> target = new LinkedHashMap<>(Map.of("key", "target"));
            Map<String, Object> source = new LinkedHashMap<>(Map.of("key", "source"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.conflictPolicy = DeepMerge.ConflictPolicy.ERROR;
            
            IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeepMerge.merge(target, source, options)
            );
            
            assertTrue(ex.getMessage().contains("conflict"));
            assertTrue(ex.getMessage().contains("root.key"));
            assertTrue(ex.getMessage().contains("String"));
        }

        @Test
        @DisplayName("Should use source with SOURCE_WINS")
        void shouldUseSourceWithSourceWinsPolicy() {
            // Invariant: SOURCE_WINS uses source value
            Map<String, Object> target = new LinkedHashMap<>(Map.of("key", "target"));
            Map<String, Object> source = new LinkedHashMap<>(Map.of("key", "source"));
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.conflictPolicy = DeepMerge.ConflictPolicy.SOURCE_WINS;
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            assertEquals("source", merged.get("key"));
        }
    }

    // ============================================================
    // Limit Enforcement Tests
    // ============================================================
    @Nested
    @DisplayName("Limit Enforcement")
    class LimitEnforcementTest {

        @Test
        @DisplayName("Should throw when maxDepth exceeded")
        void shouldThrowWhenMaxDepthExceeded() {
            // Invariant: maxDepth limit is enforced
            Map<String, Object> current = new LinkedHashMap<>(Map.of("end", "val"));
            for (int i = 0; i < 10; i++) {
                Map<String, Object> wrapper = new LinkedHashMap<>();
                wrapper.put("level" + i, current);
                current = wrapper;
            }
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.maxDepth = 5;
            
            final Map<String, Object> source = current;
            IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeepMerge.merge(null, source, options)
            );
            
            assertTrue(ex.getMessage().contains("maxDepth"));
            assertTrue(ex.getMessage().contains("5"));
        }

        @Test
        @DisplayName("Should throw when maxKeys exceeded")
        void shouldThrowWhenMaxKeysExceeded() {
            // Invariant: maxKeys limit is enforced
            Map<String, Object> source = new LinkedHashMap<>();
            for (int i = 0; i < 100; i++) {
                source.put("key" + i, "value" + i);
            }
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.maxKeys = 50;
            
            IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> DeepMerge.merge(null, source, options)
            );
            
            assertTrue(ex.getMessage().contains("maxKeys"));
            assertTrue(ex.getMessage().contains("50"));
        }
    }

    // ============================================================
    // FreezeSubtree Tests
    // ============================================================
    @Nested
    @DisplayName("FreezeSubtree Behavior")
    class FreezeSubtreeTest {

        @Test
        @DisplayName("Should not merge deeper when frozen")
        void shouldNotMergeDeeperWhenFrozen() {
            // Invariant: Frozen paths don't deep merge
            Map<String, Object> targetNested = new LinkedHashMap<>();
            targetNested.put("keep", "target");
            
            Map<String, Object> target = new LinkedHashMap<>();
            target.put("frozen", targetNested);
            
            Map<String, Object> sourceNested = new LinkedHashMap<>();
            sourceNested.put("add", "source");
            
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("frozen", sourceNested);
            
            DeepMerge.Options options = new DeepMerge.Options();
            options.rules.add(new DeepMerge.PathRule("root.frozen", null, null, true));
            
            DeepMerge.Result result = DeepMerge.merge(target, source, options);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result.value;
            @SuppressWarnings("unchecked")
            Map<String, Object> frozen = (Map<String, Object>) merged.get("frozen");
            
            // With SOURCE_WINS and freeze, source replaces
            assertFalse(frozen.containsKey("keep"));
            assertEquals("source", frozen.get("add"));
        }
    }

    // ============================================================
    // Statistics Tests
    // ============================================================
    @Nested
    @DisplayName("Merge Statistics")
    class MergeStatisticsTest {

        @Test
        @DisplayName("Should track keysVisited correctly")
        void shouldTrackKeysVisited() {
            // Invariant: keysVisited counts processed keys
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("a", 1);
            source.put("b", 2);
            source.put("c", 3);
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            assertEquals(3, result.keysVisited);
        }

        @Test
        @DisplayName("Should track nodesVisited correctly")
        void shouldTrackNodesVisited() {
            // Invariant: nodesVisited counts processed nodes
            Map<String, Object> nested = new LinkedHashMap<>(Map.of("key", "val"));
            Map<String, Object> source = new LinkedHashMap<>();
            source.put("nested", nested);
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            assertTrue(result.nodesVisited >= 2);
        }

        @Test
        @DisplayName("Fixed-seed random test for statistics")
        void fixedSeedRandomTestForStatistics() {
            // Invariant: keysVisited positive with fixed seed
            Random rand = new Random(42);
            
            Map<String, Object> source = new LinkedHashMap<>();
            for (int i = 0; i < 10; i++) {
                source.put("key" + i, rand.nextInt(100));
            }
            
            DeepMerge.Options options = new DeepMerge.Options();
            DeepMerge.Result result = DeepMerge.merge(null, source, options);
            
            assertTrue(result.keysVisited > 0);
            assertTrue(result.nodesVisited > 0);
        }
    }

    // ============================================================
    // Simple API Tests
    // ============================================================
    @Nested
    @DisplayName("Simple API")
    class SimpleAPITest {

        @Test
        @DisplayName("Should work with two-argument merge")
        void shouldWorkWithTwoArgumentMerge() {
            // Invariant: Convenience method works
            Map<String, Object> target = new LinkedHashMap<>(Map.of("a", 1));
            Map<String, Object> source = new LinkedHashMap<>(Map.of("b", 2));
            
            Object result = DeepMerge.merge(target, source);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> merged = (Map<String, Object>) result;
            assertEquals(1, merged.get("a"));
            assertEquals(2, merged.get("b"));
        }
    }
}