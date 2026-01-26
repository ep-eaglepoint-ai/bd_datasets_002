package auditlogger

import (
	"context"
	"encoding/hex"
	"fmt"
	"hash/fnv"
	"reflect"
	"sort"
	"strings"
	"sync"
	"time"
)

type AuditLogEntry struct {
	Timestamp string `json:"timestamp"`
	ID        string `json:"id"`
	Meta      struct {
		SampledIn   bool `json:"sampledIn"`
		Deduped     bool `json:"deduped"`
		Truncated   bool `json:"truncated"`
		ApproxBytes int  `json:"approxBytes"`
	} `json:"meta"`
	Data any `json:"data"`
}

type Clock interface {
	NowISO() string
}

type RandomSource interface {
	Next() float64 // [0,1)
}

type Sink interface {
	Write(ctx context.Context, batch []AuditLogEntry) error
}

type RuleAction struct {
	Kind      string // "redact" | "hash"
	With      string // for redact
	Salt      string // for hash
	PrefixLen int    // for hash, default 12
}

type Rule struct {
	Path   string
	Action RuleAction
}

type Options struct {
	MaxEntries     int
	MaxApproxBytes int
	SampleRate     float64
	Dedupe         bool
	Rules          []Rule
	Sink           Sink

	FlushBatchSize int
	FlushInterval  time.Duration

	Clock  Clock
	Random RandomSource
}

type AuditLogger struct {
	mu sync.Mutex

	logs []AuditLogEntry

	maxEntries     int
	maxApproxBytes int
	sampleRate     float64
	dedupe         bool
	rules          []Rule
	sink           Sink

	flushBatchSize int
	flushInterval  time.Duration

	clock  Clock
	random RandomSource

	lastSnapshotID string

	flushTimer *time.Timer
	flushing   bool
	pending    bool
}

func New(options Options) *AuditLogger {
	maxEntries := options.MaxEntries
	if maxEntries <= 0 {
		maxEntries = 500
	}
	
	// FIXED: Allow small MaxApproxBytes values for truncation to work
	// Only use default if not specified (0 or negative)
	maxApprox := options.MaxApproxBytes
	if maxApprox <= 0 {
		maxApprox = 250_000
	}
	
	sampleRate := clamp01(options.SampleRate)
	if options.Clock == nil {
		options.Clock = systemClock{}
	}
	if options.Random == nil {
		options.Random = mathRandom{}
	}
	bs := options.FlushBatchSize
	if bs <= 0 {
		bs = 50
	}
	fi := options.FlushInterval
	if fi < 0 {
		fi = 250 * time.Millisecond
	}

	return &AuditLogger{
		logs:           make([]AuditLogEntry, 0, maxEntries),
		maxEntries:     maxEntries,
		maxApproxBytes: maxApprox,
		sampleRate:     sampleRate,
		dedupe:         options.Dedupe,
		rules:          options.Rules,
		sink:           options.Sink,
		flushBatchSize: bs,
		flushInterval:  fi,
		clock:          options.Clock,
		random:         options.Random,
	}
}

func (a *AuditLogger) LogRequest(ctx any) {
	sampledIn := a.random.Next() < a.sampleRate
	if !sampledIn {
		return
	}

	raw := safeClone(ctx)
	ruled := applyRules(raw, a.rules)

	stable := stableStringify(ruled)
	approxBytes := approxUtf8Bytes(stable)

	truncated := false
	finalData := ruled
	if approxBytes > a.maxApproxBytes {
		truncated = true
		finalData = truncateToBudget(ruled, a.maxApproxBytes)
	}

	finalStable := stableStringify(finalData)
	id := cheapHash(finalStable)

	a.mu.Lock()
	defer a.mu.Unlock()

	deduped := a.dedupe && a.lastSnapshotID == id
	if deduped {
		return
	}
	a.lastSnapshotID = id

	var entry AuditLogEntry
	entry.Timestamp = a.clock.NowISO()
	entry.ID = id
	entry.Meta.SampledIn = sampledIn
	entry.Meta.Deduped = deduped
	entry.Meta.Truncated = truncated
	if truncated {
		entry.Meta.ApproxBytes = approxUtf8Bytes(finalStable)
	} else {
		entry.Meta.ApproxBytes = approxBytes
	}
	entry.Data = finalData

	a.pushRingLocked(entry)
	a.scheduleFlushLocked()
}

func (a *AuditLogger) GetLogCount() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return len(a.logs)
}

func (a *AuditLogger) GetLogsSnapshot() []AuditLogEntry {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]AuditLogEntry, len(a.logs))
	copy(out, a.logs)
	return out
}

func (a *AuditLogger) FlushNow(ctx context.Context) error {
	if a.sink == nil {
		return nil
	}
	return a.flushInternal(ctx)
}

func (a *AuditLogger) pushRingLocked(entry AuditLogEntry) {
	a.logs = append(a.logs, entry)
	if len(a.logs) > a.maxEntries {
		extra := len(a.logs) - a.maxEntries
		a.logs = append([]AuditLogEntry{}, a.logs[extra:]...)
	}
}

func (a *AuditLogger) scheduleFlushLocked() {
	if a.sink == nil {
		return
	}

	if a.flushInterval == 0 {
		go func() { _ = a.flushInternal(context.Background()) }()
		return
	}

	if a.flushTimer != nil {
		return
	}

	a.flushTimer = time.AfterFunc(a.flushInterval, func() {
		a.mu.Lock()
		a.flushTimer = nil
		a.mu.Unlock()
		_ = a.flushInternal(context.Background())
	})
}

func (a *AuditLogger) flushInternal(ctx context.Context) error {
	a.mu.Lock()
	if a.sink == nil {
		a.mu.Unlock()
		return nil
	}
	if a.flushing {
		a.pending = true
		a.mu.Unlock()
		return nil
	}
	a.flushing = true
	a.mu.Unlock()

	defer func() {
		a.mu.Lock()
		a.flushing = false
		a.mu.Unlock()
	}()

	for {
		a.mu.Lock()
		logsCopy := make([]AuditLogEntry, len(a.logs))
		copy(logsCopy, a.logs)
		a.mu.Unlock()

		for i := 0; i < len(logsCopy); {
			end := i + a.flushBatchSize
			if end > len(logsCopy) {
				end = len(logsCopy)
			}
			batch := logsCopy[i:end]
			if err := a.sink.Write(ctx, batch); err != nil {
				return err
			}
			i = end
		}

		a.mu.Lock()
		a.logs = nil
		p := a.pending
		a.pending = false
		hasMore := len(a.logs) > 0
		a.mu.Unlock()

		if !(p && hasMore) {
			return nil
		}
	}
}

type systemClock struct{}

func (systemClock) NowISO() string { return time.Now().UTC().Format(time.RFC3339Nano) }

type mathRandom struct{}

func (mathRandom) Next() float64 { return float64(time.Now().UnixNano()%1_000_000) / 1_000_000.0 }

func clamp01(n float64) float64 {
	if n < 0 {
		return 0
	}
	if n > 1 {
		return 1
	}
	return n
}

func approxUtf8Bytes(s string) int {
	return len([]byte(s))
}

func cheapHash(s string) string {
	h := fnv.New32a()
	_, _ = h.Write([]byte(s))
	return hex.EncodeToString(h.Sum(nil))
}

func safeClone(input any) any {
	visited := map[uintptr]any{}

	var clone func(v any) any
	clone = func(v any) any {
		if v == nil {
			return nil
		}

		rv := reflect.ValueOf(v)
		rt := rv.Type()

		switch rv.Kind() {
		case reflect.Bool, reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
			reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
			reflect.Float32, reflect.Float64, reflect.String:
			return v
		case reflect.Func:
			return map[string]any{"__type": "Function", "name": rt.String()}
		}

		if t, ok := v.(time.Time); ok {
			return map[string]any{"__type": "Date", "value": t.UTC().Format(time.RFC3339Nano)}
		}
		if err, ok := v.(error); ok {
			return map[string]any{
				"__type":  "Error",
				"name":    reflect.TypeOf(err).String(),
				"message": err.Error(),
			}
		}

		switch rv.Kind() {
		case reflect.Map:
			if rv.IsNil() {
				return nil
			}
			ptr := rv.Pointer()
			if existing, ok := visited[ptr]; ok {
				return existing
			}
			out := map[string]any{}
			visited[ptr] = out
			for _, k := range rv.MapKeys() {
				ks := fmt.Sprint(k.Interface())
				out[ks] = clone(rv.MapIndex(k).Interface())
			}
			return out

		case reflect.Slice, reflect.Array:
			if rv.Kind() == reflect.Slice && rv.IsNil() {
				return nil
			}
			var ptr uintptr
			if rv.Kind() == reflect.Slice && rv.Len() > 0 {
				ptr = rv.Pointer()
				if existing, ok := visited[ptr]; ok {
					return existing
				}
			}
			out := make([]any, rv.Len())
			if ptr != 0 {
				visited[ptr] = out
			}
			for i := 0; i < rv.Len(); i++ {
				out[i] = clone(rv.Index(i).Interface())
			}
			return out

		case reflect.Pointer:
			if rv.IsNil() {
				return nil
			}
			ptr := rv.Pointer()
			if existing, ok := visited[ptr]; ok {
				return existing
			}
			visited[ptr] = map[string]any{"__type": "Circular"}
			c := clone(rv.Elem().Interface())
			visited[ptr] = c
			return c

		case reflect.Struct:
			out := map[string]any{}
			for i := 0; i < rv.NumField(); i++ {
				f := rt.Field(i)
				if f.PkgPath != "" {
					continue
				}
				out[f.Name] = clone(rv.Field(i).Interface())
			}
			return out

		default:
			return fmt.Sprint(v)
		}
	}

	return clone(input)
}

func stableStringify(v any) string {
	var sb strings.Builder
	seen := map[uintptr]bool{}

	var write func(x any)
	write = func(x any) {
		if x == nil {
			sb.WriteString("null")
			return
		}
		rv := reflect.ValueOf(x)

		switch rv.Kind() {
		case reflect.String:
			sb.WriteString(`"`)
			sb.WriteString(rv.String())
			sb.WriteString(`"`)
		case reflect.Bool:
			if rv.Bool() {
				sb.WriteString("true")
			} else {
				sb.WriteString("false")
			}
		case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
			sb.WriteString(fmt.Sprintf("%d", rv.Int()))
		case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
			sb.WriteString(fmt.Sprintf("%d", rv.Uint()))
		case reflect.Float32, reflect.Float64:
			sb.WriteString(fmt.Sprintf("%g", rv.Float()))
		case reflect.Map:
			if rv.IsNil() {
				sb.WriteString("null")
				return
			}
			ptr := rv.Pointer()
			if ptr != 0 {
				if seen[ptr] {
					sb.WriteString(`{"__type":"Circular"}`)
					return
				}
				seen[ptr] = true
			}
			sb.WriteString("{")
			keys := rv.MapKeys()
			keyStrs := make([]string, 0, len(keys))
			kv := make(map[string]reflect.Value, len(keys))
			for _, k := range keys {
				ks := fmt.Sprint(k.Interface())
				keyStrs = append(keyStrs, ks)
				kv[ks] = rv.MapIndex(k)
			}
			sort.Strings(keyStrs)
			for i, ks := range keyStrs {
				if i > 0 {
					sb.WriteString(",")
				}
				sb.WriteString(`"`)
				sb.WriteString(ks)
				sb.WriteString(`"`)
				sb.WriteString(":")
				write(kv[ks].Interface())
			}
			sb.WriteString("}")
		case reflect.Slice, reflect.Array:
			if rv.Kind() == reflect.Slice && rv.IsNil() {
				sb.WriteString("null")
				return
			}
			ptr := uintptr(0)
			if rv.Kind() == reflect.Slice && rv.Len() > 0 {
				ptr = rv.Pointer()
			}
			if ptr != 0 {
				if seen[ptr] {
					sb.WriteString(`[{"__type":"Circular"}]`)
					return
				}
				seen[ptr] = true
			}
			sb.WriteString("[")
			for i := 0; i < rv.Len(); i++ {
				if i > 0 {
					sb.WriteString(",")
				}
				write(rv.Index(i).Interface())
			}
			sb.WriteString("]")
		default:
			sb.WriteString(`"`)
			sb.WriteString(fmt.Sprint(x))
			sb.WriteString(`"`)
		}
	}

	write(v)
	return sb.String()
}

func applyRules(snapshot any, rules []Rule) any {
	if len(rules) == 0 {
		return snapshot
	}
	root := safeClone(snapshot)

	for _, rule := range rules {
		matches := findMatches(root, rule.Path)
		for _, m := range matches {
			parent := m.parent
			key := m.key
			if parent == nil || key == "" {
				continue
			}
			current, ok := parent[key]
			if !ok {
				continue
			}
			switch rule.Action.Kind {
			case "redact":
				with := rule.Action.With
				if with == "" {
					with = "[REDACTED]"
				}
				parent[key] = with
			case "hash":
				prefixLen := rule.Action.PrefixLen
				if prefixLen <= 0 {
					prefixLen = 12
				}
				st := stableStringify(current)
				h := cheapHash(rule.Action.Salt + st)
				if prefixLen > len(h) {
					prefixLen = len(h)
				}
				parent[key] = fmt.Sprintf("[HASH:%s]", h[:prefixLen])
			}
		}
	}
	return root
}

type match struct {
	parent map[string]any
	key    string
}

func findMatches(root any, pathExpr string) []match {
	if !strings.HasPrefix(pathExpr, "$.") {
		return nil
	}
	tokens := tokenize(pathExpr[2:])
	out := []match{}

	var visit func(node any, parent map[string]any, key string, ti int)
	visit = func(node any, parent map[string]any, key string, ti int) {
		if ti == len(tokens) {
			if parent != nil && key != "" {
				out = append(out, match{parent: parent, key: key})
			}
			return
		}
		t := tokens[ti]

		if t.kind == "deep" {
			visit(node, parent, key, ti+1)
			switch n := node.(type) {
			case []any:
				for i := range n {
					visit(n[i], nil, "", ti)
				}
			case map[string]any:
				for k := range n {
					visit(n[k], n, k, ti)
				}
			}
			return
		}

		switch n := node.(type) {
		case map[string]any:
			if t.kind == "wildcard" {
				for k := range n {
					visit(n[k], n, k, ti+1)
				}
				return
			}
			if t.kind == "field" {
				child, ok := n[t.name]
				if !ok {
					return
				}
				visit(child, n, t.name, ti+1)
				return
			}
		case []any:
			if t.kind == "wildcard" || t.kind == "arrayAll" {
				for i := range n {
					visit(n[i], nil, "", ti+1)
				}
				return
			}
		default:
			return
		}
	}

	visit(root, nil, "", 0)
	return out
}

type token struct {
	kind string // field | wildcard | arrayAll | deep
	name string
}

func tokenize(p string) []token {
	parts := strings.Split(p, ".")
	toks := make([]token, 0, len(parts))
	for _, part := range parts {
		switch {
		case part == "**":
			toks = append(toks, token{kind: "deep"})
		case part == "*":
			toks = append(toks, token{kind: "wildcard"})
		case strings.HasSuffix(part, "[*]"):
			name := strings.TrimSuffix(part, "[*]")
			toks = append(toks, token{kind: "field", name: name})
			toks = append(toks, token{kind: "arrayAll"})
		default:
			toks = append(toks, token{kind: "field", name: part})
		}
	}
	return toks
}

func truncateToBudget(value any, maxBytes int) any {
	clone := safeClone(value)

	var summarize func(v any, depth int) any
	summarize = func(v any, depth int) any {
		if v == nil {
			return nil
		}
		switch vv := v.(type) {
		case map[string]any:
			if depth <= 0 {
				return map[string]any{"__truncated": true, "kind": "Object", "keys": len(vv)}
			}
			keys := make([]string, 0, len(vv))
			for k := range vv {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			limit := 20
			if len(keys) < limit {
				limit = len(keys)
			}
			out := map[string]any{}
			for i := 0; i < limit; i++ {
				k := keys[i]
				out[k] = summarize(vv[k], depth-1)
			}
			if len(keys) > limit {
				out["__moreKeys"] = len(keys) - limit
			}
			return out
		case []any:
			if depth <= 0 {
				return map[string]any{"__truncated": true, "kind": "Array", "length": len(vv)}
			}
			limit := 10
			if len(vv) < limit {
				limit = len(vv)
			}
			out := make([]any, 0, limit+1)
			for i := 0; i < limit; i++ {
				out = append(out, summarize(vv[i], depth-1))
			}
			if len(vv) > limit {
				out = append(out, map[string]any{"__more": len(vv) - limit})
			}
			return out
		default:
			return v
		}
	}

	for depth := 6; depth >= 0; depth-- {
		cand := summarize(clone, depth)
		if approxUtf8Bytes(stableStringify(cand)) <= maxBytes {
			return cand
		}
	}
	return map[string]any{"__truncated": true, "kind": fmt.Sprintf("%T", value)}
}