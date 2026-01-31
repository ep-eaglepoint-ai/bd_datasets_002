import java.lang.reflect.Array;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Secure, Rule-Driven Deep Merge Utility.
 * Supports Map/List/Set/array merging with configurable strategies,
 * cycle detection, cloning, blocked-key filtering, and path-based rules.
 */
public final class DeepMerge {

    private DeepMerge() {}

    public enum ArrayStrategy { REPLACE, CONCAT, MERGE_BY_INDEX }
    public enum NullPolicy { SOURCE_WINS, TARGET_WINS, SKIP }
    public enum ConflictPolicy { SOURCE_WINS, TARGET_WINS, ERROR }

    /**
     * Path-based rule for customizing merge behavior at specific paths.
     */
    public static final class PathRule {
        public final String pathGlob;
        public final Set<String> extraBlockedKeys;
        public final ArrayStrategy arrayStrategyOverride;
        public final boolean freezeSubtree;

        public PathRule(
                String pathGlob,
                Set<String> extraBlockedKeys,
                ArrayStrategy arrayStrategyOverride,
                boolean freezeSubtree
        ) {
            this.pathGlob = pathGlob;
            this.extraBlockedKeys = (extraBlockedKeys == null) ? Set.of() : Set.copyOf(extraBlockedKeys);
            this.arrayStrategyOverride = arrayStrategyOverride;
            this.freezeSubtree = freezeSubtree;
        }
    }

    /**
     * Configuration options for the merge operation.
     */
    public static final class Options {
        public boolean protectKeys = true;
        public Set<String> blockedKeys = new HashSet<>(Arrays.asList(
                "__proto__", "prototype", "constructor",
                "@type", "$type", "class", "@class"
        ));

        public ArrayStrategy arrayStrategy = ArrayStrategy.REPLACE;
        public boolean mergeMaps = true;
        public boolean mergeSets = true;
        public boolean cloneAssignedValues = true;

        public NullPolicy nullPolicy = NullPolicy.SOURCE_WINS;
        public ConflictPolicy conflictPolicy = ConflictPolicy.SOURCE_WINS;

        public int maxDepth = 200;
        public long maxKeys = 200_000;
        public List<PathRule> rules = new ArrayList<>();
        public CustomMergeHook customMerge = null;

        public interface CustomMergeHook {
            boolean handle(Context ctx);
        }
    }

    /**
     * Result of a merge operation.
     */
    public static final class Result {
        public final Object value;
        public final long keysVisited;
        public final long nodesVisited;

        Result(Object value, long keysVisited, long nodesVisited) {
            this.value = value;
            this.keysVisited = keysVisited;
            this.nodesVisited = nodesVisited;
        }
    }

    /**
     * Context passed to custom merge hooks.
     */
    public static final class Context {
        public final Object target;
        public final Object source;
        public final Options options;
        public final String path;
        private final State state;

        private Context(Object target, Object source, Options options, String path, State state) {
            this.target = target;
            this.source = source;
            this.options = options;
            this.path = path;
            this.state = state;
        }

        public int depth() { return state.depth; }
        public long keysVisited() { return state.keysVisited; }
        public long nodesVisited() { return state.nodesVisited; }
        public RuleMatch ruleMatch() { return state.rulesAt(path); }
    }

    /**
     * Result of matching path rules.
     */
    public static final class RuleMatch {
        public final ArrayStrategy arrayStrategy;
        public final Set<String> blockedKeys;
        public final boolean freezeSubtree;

        RuleMatch(ArrayStrategy arrayStrategy, Set<String> blockedKeys, boolean freezeSubtree) {
            this.arrayStrategy = arrayStrategy;
            this.blockedKeys = blockedKeys;
            this.freezeSubtree = freezeSubtree;
        }
    }

    private static final class State {
        final Options options;
        int depth = 0;
        long keysVisited = 0;
        long nodesVisited = 0;
        final IdentityHashMap<Object, Object> pairSeen = new IdentityHashMap<>();

        State(Options options) { this.options = options; }

        RuleMatch rulesAt(String path) {
            ArrayStrategy strat = options.arrayStrategy;
            boolean freeze = false;
            Set<String> blocked = new HashSet<>();
            if (options.protectKeys) blocked.addAll(options.blockedKeys);

            for (PathRule r : options.rules) {
                if (globMatch(r.pathGlob, path)) {
                    blocked.addAll(r.extraBlockedKeys);
                    if (r.arrayStrategyOverride != null) strat = r.arrayStrategyOverride;
                    if (r.freezeSubtree) freeze = true;
                }
            }
            return new RuleMatch(strat, Collections.unmodifiableSet(blocked), freeze);
        }
    }

    // ---- Public API ----

    public static Object merge(Object target, Object source) {
        return merge(target, source, new Options()).value;
    }

    public static Result merge(Object target, Object source, Options options) {
        if (options == null) options = new Options();
        State state = new State(options);
        Object out = mergeInternal(target, source, state, "root");
        return new Result(out, state.keysVisited, state.nodesVisited);
    }

    // ---- Core merge ----

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static Object mergeInternal(Object target, Object source, State state, String path) {
        Options opt = state.options;
        state.nodesVisited++;

        if (source == null) {
            return switch (opt.nullPolicy) {
                case SOURCE_WINS -> null;
                case TARGET_WINS -> target;
                case SKIP -> target;
            };
        }

        RuleMatch rm = state.rulesAt(path);
        if (rm.freezeSubtree) {
            return resolveConflict(target, source, opt, path);
        }

        if (!isMergeable(source)) {
            return resolveConflict(target, source, opt, path);
        }

        if (!isMergeable(target)) {
            target = newContainerLike(source);
        }

        if (state.pairSeen.containsKey(source)) {
            return state.pairSeen.get(source);
        }
        state.pairSeen.put(source, target);

        if (state.depth++ > opt.maxDepth) {
            state.depth--;
            throw new IllegalStateException("merge: maxDepth (" + opt.maxDepth + ") exceeded at " + path);
        }

        try {
            if (opt.customMerge != null) {
                boolean handled = opt.customMerge.handle(new Context(target, source, opt, path, state));
                if (handled) return target;
            }

            // Map
            if (source instanceof Map) {
                if (!opt.mergeMaps) {
                    return opt.cloneAssignedValues ? deepCloneContainer(source, new IdentityHashMap<>()) : source;
                }
                Map src = (Map) source;
                Map tgt = (target instanceof Map) ? (Map) target : new LinkedHashMap();

                for (Object kObj : src.keySet()) {
                    state.keysVisited++;
                    if (state.keysVisited > opt.maxKeys) {
                        throw new IllegalStateException("merge: maxKeys (" + opt.maxKeys + ") exceeded at " + path);
                    }

                    String keyStr = (kObj instanceof String) ? (String) kObj : null;
                    if (keyStr != null && opt.protectKeys && rm.blockedKeys.contains(keyStr)) continue;

                    Object sv = src.get(kObj);
                    Object tv = tgt.get(kObj);

                    String childPath = (keyStr != null) ? (path + "." + keyStr) : (path + ".{key}");
                    Object merged = mergeValue(tv, sv, state, childPath);
                    tgt.put(kObj, merged);
                }
                return tgt;
            }

            // List
            if (source instanceof List) {
                List<?> src = (List<?>) source;
                List<Object> tgt = (target instanceof List) ? (List<Object>) target : new ArrayList<>();

                ArrayStrategy strat = rm.arrayStrategy;

                switch (strat) {
                    case REPLACE -> {
                        tgt.clear();
                        for (int i = 0; i < src.size(); i++) {
                            Object sv = src.get(i);
                            tgt.add(opt.cloneAssignedValues ? deepCloneContainerOrLeaf(sv) : sv);
                        }
                        return tgt;
                    }
                    case CONCAT -> {
                        for (int i = 0; i < src.size(); i++) {
                            Object sv = src.get(i);
                            tgt.add(opt.cloneAssignedValues ? deepCloneContainerOrLeaf(sv) : sv);
                        }
                        return tgt;
                    }
                    case MERGE_BY_INDEX -> {
                        int max = Math.max(tgt.size(), src.size());
                        while (tgt.size() < src.size()) tgt.add(null);

                        for (int i = 0; i < max; i++) {
                            if (i < src.size()) {
                                Object sv = src.get(i);
                                Object tv = (i < tgt.size()) ? tgt.get(i) : null;
                                String childPath = path + "[" + i + "]";
                                Object merged = mergeValue(tv, sv, state, childPath);
                                if (i < tgt.size()) tgt.set(i, merged);
                                else tgt.add(merged);
                            }
                        }
                        return tgt;
                    }
                }
            }

            // Array
            if (source.getClass().isArray()) {
                int srcLen = Array.getLength(source);
                List<Object> srcList = new ArrayList<>(srcLen);
                for (int i = 0; i < srcLen; i++) srcList.add(Array.get(source, i));

                Object listTarget = (target != null && target.getClass().isArray())
                        ? arrayToList(target)
                        : (target instanceof List ? target : new ArrayList<>());

                Object mergedList = mergeInternal(listTarget, srcList, state, path);

                Class<?> comp = source.getClass().getComponentType();
                List<?> ml = (List<?>) mergedList;
                Object out = Array.newInstance(comp, ml.size());
                for (int i = 0; i < ml.size(); i++) Array.set(out, i, ml.get(i));
                return out;
            }

            // Set
            if (source instanceof Set) {
                if (!opt.mergeSets) {
                    return opt.cloneAssignedValues ? deepCloneContainer(source, new IdentityHashMap<>()) : source;
                }
                Set<?> src = (Set<?>) source;
                Set<Object> tgt = (target instanceof Set) ? (Set<Object>) target : new LinkedHashSet<>();
                for (Object sv : src) {
                    state.keysVisited++;
                    if (state.keysVisited > opt.maxKeys) {
                        throw new IllegalStateException("merge: maxKeys (" + opt.maxKeys + ") exceeded at " + path);
                    }
                    tgt.add(opt.cloneAssignedValues ? deepCloneContainerOrLeaf(sv) : sv);
                }
                return tgt;
            }

            return opt.cloneAssignedValues ? deepCloneContainerOrLeaf(source) : source;

        } finally {
            state.depth--;
        }
    }

    private static Object mergeValue(Object tv, Object sv, State state, String path) {
        Options opt = state.options;

        if (sv == null) {
            return switch (opt.nullPolicy) {
                case SOURCE_WINS -> null;
                case TARGET_WINS -> tv;
                case SKIP -> tv;
            };
        }

        boolean srcMergeable = isMergeable(sv);
        boolean tgtMergeable = isMergeable(tv);

        if (srcMergeable && tgtMergeable) {
            return mergeInternal(tv, sv, state, path);
        }

        if (srcMergeable) {
            Object container = newContainerLike(sv);
            return mergeInternal(container, sv, state, path);
        }

        return resolveConflict(tv, sv, opt, path);
    }

    private static Object resolveConflict(Object target, Object source, Options opt, String path) {
        if (source == null) {
            return switch (opt.nullPolicy) {
                case SOURCE_WINS -> null;
                case TARGET_WINS -> target;
                case SKIP -> target;
            };
        }

        if (target == null) {
            return opt.cloneAssignedValues ? deepCloneLeaf(source) : source;
        }

        return switch (opt.conflictPolicy) {
            case SOURCE_WINS -> (opt.cloneAssignedValues ? deepCloneLeaf(source) : source);
            case TARGET_WINS -> target;
            case ERROR -> throw new IllegalStateException(
                    "merge: conflict at " + path + " (target=" + target.getClass().getSimpleName() +
                    ", source=" + source.getClass().getSimpleName() + ")"
            );
        };
    }

    // ---- Helpers ----

    private static boolean isMergeable(Object v) {
        if (v == null) return false;
        return (v instanceof Map) || (v instanceof List) || (v instanceof Set) || v.getClass().isArray();
    }

    private static Object newContainerLike(Object source) {
        if (source instanceof Map) return new LinkedHashMap<>();
        if (source instanceof List) return new ArrayList<>();
        if (source instanceof Set) return new LinkedHashSet<>();
        if (source != null && source.getClass().isArray()) {
            return Array.newInstance(source.getClass().getComponentType(), 0);
        }
        return new LinkedHashMap<>();
    }

    private static List<Object> arrayToList(Object array) {
        int len = Array.getLength(array);
        List<Object> out = new ArrayList<>(len);
        for (int i = 0; i < len; i++) out.add(Array.get(array, i));
        return out;
    }

    private static Object deepCloneContainerOrLeaf(Object v) {
        if (v == null) return null;
        if (isMergeable(v)) return deepCloneContainer(v, new IdentityHashMap<>());
        return deepCloneLeaf(v);
    }

    private static Object deepCloneLeaf(Object v) {
        if (v == null) return null;
        if (v instanceof Date d) return new Date(d.getTime());
        if (v instanceof Instant i) return Instant.ofEpochMilli(i.toEpochMilli());
        if (v instanceof Pattern p) return Pattern.compile(p.pattern(), p.flags());
        return v;
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    private static Object deepCloneContainer(Object v, IdentityHashMap<Object, Object> seen) {
        if (v == null) return null;
        if (!isMergeable(v)) return deepCloneLeaf(v);
        if (seen.containsKey(v)) return seen.get(v);

        if (v instanceof Map m) {
            Map out = new LinkedHashMap();
            seen.put(v, out);
            for (Object k : m.keySet()) out.put(k, deepCloneContainerOrLeaf(m.get(k)));
            return out;
        }
        if (v instanceof List l) {
            List out = new ArrayList(l.size());
            seen.put(v, out);
            for (Object e : l) out.add(deepCloneContainerOrLeaf(e));
            return out;
        }
        if (v instanceof Set s) {
            Set out = new LinkedHashSet();
            seen.put(v, out);
            for (Object e : s) out.add(deepCloneContainerOrLeaf(e));
            return out;
        }
        if (v.getClass().isArray()) {
            int len = Array.getLength(v);
            Object out = Array.newInstance(v.getClass().getComponentType(), len);
            seen.put(v, out);
            for (int i = 0; i < len; i++) Array.set(out, i, deepCloneContainerOrLeaf(Array.get(v, i)));
            return out;
        }
        return v;
    }

    private static boolean globMatch(String glob, String path) {
        if (glob == null || glob.isEmpty()) return false;
        if (glob.equals(path)) return true;

        String[] g = glob.split("\\.");
        String[] p = path.split("\\.");

        return matchSeg(g, 0, p, 0);
    }

    private static boolean matchSeg(String[] g, int gi, String[] p, int pi) {
        if (gi == g.length) return pi == p.length;
        if (g[gi].equals("**")) {
            if (gi == g.length - 1) return true;
            for (int k = pi; k <= p.length; k++) {
                if (matchSeg(g, gi + 1, p, k)) return true;
            }
            return false;
        }
        if (pi >= p.length) return false;

        String gs = g[gi];
        if (gs.equals("*")) {
            return matchSeg(g, gi + 1, p, pi + 1);
        }
        if (gs.equals(p[pi])) {
            return matchSeg(g, gi + 1, p, pi + 1);
        }
        return false;
    }
}