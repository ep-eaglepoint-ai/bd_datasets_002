package tests

import (
	"bytes"
	"os"
	"reflect"
	"regexp"
	"runtime"
	"strings"
	"testing"
	"time"
	
	"gocode/analyzer"
)

func TestCloseReturnsPromptly(t *testing.T) {
	svc := analyzer.NewHeavyService()
	done := make(chan struct{})
	go func() {
		svc.Close()
		close(done)
	}()

	select {
	case <-done:
		// ok
	case <-time.After(2 * time.Second):
		t.Fatalf("Close() did not return promptly; background goroutine may be stuck")
	}
}

func TestIngestAndReportStatsUnlocked_Format(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svc.Ingest(200)
	out := svc.ReportStatsUnlocked()

	re := regexp.MustCompile(`^Alloc=\d+MiB TotalAlloc=\d+MiB Sys=\d+MiB NumGC=\d+$`)
	if !re.MatchString(out) {
		t.Fatalf("unexpected ReportStatsUnlocked format: %q", out)
	}
}

func TestReportStats_WritesExpectedFields(t *testing.T) {
	// Capture stdout by redirecting to a pipe
	orig := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("os.Pipe: %v", err)
	}
	os.Stdout = w
	t.Cleanup(func() {
		os.Stdout = orig
		_ = r.Close()
	})

	analyzer.ReportStats()

	_ = w.Close()
	var buf bytes.Buffer
	_, _ = buf.ReadFrom(r)
	s := buf.String()

	mustContain := []string{"Alloc = ", "TotalAlloc = ", "Sys = ", "NumGC = "}
	for _, sub := range mustContain {
		if !bytes.Contains(buf.Bytes(), []byte(sub)) {
			t.Fatalf("expected output to contain %q; got %q", sub, s)
		}
	}
}

func TestReduceHeapAllocations(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	var m1, m2 runtime.MemStats
	runtime.GC() // Force GC to get baseline
	runtime.ReadMemStats(&m1)

	svc.Ingest(1000)

	runtime.GC() // Force GC again to measure allocations
	runtime.ReadMemStats(&m2)

	allocations := m2.TotalAlloc - m1.TotalAlloc
	allocsPerRecord := allocations / 1000

	if allocsPerRecord > 100*1024 {
		t.Errorf("Too many allocations per record: %d bytes (expected < 100KB)", allocsPerRecord)
	}
}

func TestMinimizePointerIndirection(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svc.Ingest(100)

	recordType := reflect.TypeOf(analyzer.LargeRecord{})
	
	pointerCount := 0
	valueCount := 0
	
	// Check each field: direct pointer, or pointer inside slice/map
	for i := 0; i < recordType.NumField(); i++ {
		field := recordType.Field(i)
		fieldType := field.Type
		
		if fieldType.Kind() == reflect.Ptr {
			pointerCount++
		} else if fieldType.Kind() == reflect.Array || fieldType.Kind() == reflect.Slice {
			// Check if slice elements are pointers
			elemType := fieldType.Elem()
			if elemType.Kind() == reflect.Ptr {
				pointerCount++
			} else {
				valueCount++
			}
		} else if fieldType.Kind() == reflect.Map {
			// Check if map values are pointers
			valType := fieldType.Elem()
			if valType.Kind() == reflect.Ptr {
				pointerCount++
			} else {
				valueCount++
			}
		} else {
			valueCount++
		}
	}

	if pointerCount > 2 {
		t.Errorf("Too many pointer fields: %d (expected <= 2)", pointerCount)
	}
}

func TestValueTypesInsteadOfPointers(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svc.Ingest(10)

	recordType := reflect.TypeOf(analyzer.LargeRecord{})
	
	checks := map[string]bool{
		"ID":         false,
		"Data":       false,
		"Hash":       false,
		"Encoded":    false,
		"Tags":       false,
		"History":    false,
		"Meta":       false,
		"Attributes": false,
	}

	for fieldName, _ := range checks {
		field, found := recordType.FieldByName(fieldName)
		if !found {
			t.Errorf("Field %s not found", fieldName)
			continue
		}

		fieldType := field.Type
		isValueType := true

		// Check if field itself or its elements/values are pointers
		if fieldType.Kind() == reflect.Ptr {
			isValueType = false
		} else if fieldType.Kind() == reflect.Slice {
			elemType := fieldType.Elem()
			if elemType.Kind() == reflect.Ptr {
				isValueType = false
			}
		} else if fieldType.Kind() == reflect.Map {
			valType := fieldType.Elem()
			if valType.Kind() == reflect.Ptr {
				isValueType = false
			}
		}

		checks[fieldName] = isValueType
	}

	for fieldName, isValue := range checks {
		if !isValue {
			t.Errorf("Field %s is not a value type", fieldName)
		}
	}
}

func TestBufferReuse(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	// Use reflection to find buffer fields ([]byte slices)
	svcType := reflect.TypeOf(svc).Elem()
	
	bufferFields := []string{"idBuf", "keyBuf", "tagBuf", "eventBuf"}
	foundBuffers := 0

	for _, bufName := range bufferFields {
		field, found := svcType.FieldByName(bufName)
		if found && field.Type.Kind() == reflect.Slice && field.Type.Elem().Kind() == reflect.Uint8 {
			foundBuffers++
		}
	}

	if foundBuffers < 2 {
		t.Errorf("Not enough buffer reuse fields found: %d (expected >= 2)", foundBuffers)
	}

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	for i := 0; i < 10; i++ {
		svc.Ingest(100)
	}

	runtime.GC()
	runtime.ReadMemStats(&m2)

	secondBatchAllocs := m2.TotalAlloc - m1.TotalAlloc
	if secondBatchAllocs > 50*1024*1024 {
		t.Errorf("Excessive allocations suggest no buffer reuse: %d bytes", secondBatchAllocs)
	}
}

func TestEliminateRedundantCopies(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	svc.Ingest(500)

	runtime.GC()
	runtime.ReadMemStats(&m2)

	memUsed := m2.Alloc - m1.Alloc
	expectedMaxMem := uint64(500 * 2 * 1024)

	if memUsed > expectedMaxMem*2 {
		t.Errorf("Excessive memory usage suggests redundant copies: %d bytes (expected < %d)", 
			memUsed, expectedMaxMem*2)
	}

	var m3, m4 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m3)

	svc.Ingest(200) // Triggers snapshot internally

	runtime.GC()
	runtime.ReadMemStats(&m4)

	snapshotAllocs := m4.TotalAlloc - m3.TotalAlloc
	if snapshotAllocs > 10*1024*1024 {
		t.Errorf("Snapshot creates excessive allocations: %d bytes", snapshotAllocs)
	}
}

func TestSimplifyBackgroundRoutines(t *testing.T) {
	svc := analyzer.NewHeavyService()

	runtime.GC()
	goroutinesBefore := runtime.NumGoroutine()

	time.Sleep(500 * time.Millisecond)

	// Measure memory growth over time
	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	time.Sleep(2 * time.Second)

	runtime.GC()
	runtime.ReadMemStats(&m2)

	memGrowth := m2.Alloc - m1.Alloc
	if memGrowth > 50*1024*1024 {
		t.Errorf("Background routine retains too much memory: %d bytes growth", memGrowth)
	}

	closeStart := time.Now()
	svc.Close()
	closeDuration := time.Since(closeStart)

	if closeDuration > 1*time.Second {
		t.Errorf("Close() took too long: %v", closeDuration)
	}

	time.Sleep(100 * time.Millisecond)
	goroutinesAfter := runtime.NumGoroutine()
	if goroutinesAfter >= goroutinesBefore {
		// ok
	}
}

func TestImproveSliceMapUsage(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svcType := reflect.TypeOf(svc).Elem()
	
	cacheField, found := svcType.FieldByName("cache")
	if found {
		testSvc := analyzer.NewHeavyService()
		defer testSvc.Close()
		_ = cacheField
	}

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)

	svc.Ingest(1000)

	runtime.GC()
	runtime.ReadMemStats(&m2)

	memUsed := m2.Alloc - m1.Alloc
	expectedMax := uint64(1000 * 3 * 1024)

	if memUsed > expectedMax*3 {
		t.Errorf("Excessive memory suggests poor preallocation: %d bytes", memUsed)
	}

	// Test that cache compaction releases memory
	var m3, m4 runtime.MemStats
	svc.Ingest(10000) // Triggers compaction
	runtime.GC()
	runtime.ReadMemStats(&m3)

	time.Sleep(100 * time.Millisecond)
	runtime.GC()
	runtime.ReadMemStats(&m4)

	if m4.Alloc > m3.Alloc*2 {
		t.Errorf("Memory not properly released after compaction")
	}
}

func TestFunctionalCorrectness(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svc.Ingest(100)
	
	stats := svc.ReportStatsUnlocked()
	if stats == "" {
		t.Errorf("ReportStatsUnlocked returned empty string")
	}

	for i := 0; i < 10; i++ {
		svc.Ingest(50)
		stats := svc.ReportStatsUnlocked()
		if stats == "" {
			t.Errorf("ReportStatsUnlocked failed after multiple operations")
			return
		}
	}

	svc2 := analyzer.NewHeavyService()
	done := make(chan bool)
	go func() {
		svc2.Close()
		close(done)
	}()

	select {
	case <-done:
		// ok
	case <-time.After(2 * time.Second):
		t.Errorf("Close() did not complete")
	}
}

func TestMeasurableGCImprovement(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	var m1, m2 runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m1)
	initialGC := m1.NumGC

	svc.Ingest(5000)

	runtime.GC()
	runtime.ReadMemStats(&m2)
	finalGC := m2.NumGC

	gcCount := finalGC - initialGC
	totalAlloc := m2.TotalAlloc - m1.TotalAlloc
	heapAlloc := m2.Alloc

	if gcCount > 20 {
		t.Errorf("Too many GC cycles: %d (expected < 20)", gcCount)
	}

	expectedMaxAlloc := uint64(5000 * 5 * 1024)
	if totalAlloc > expectedMaxAlloc*2 {
		t.Errorf("Excessive total allocations: %d bytes (expected < %d)", 
			totalAlloc, expectedMaxAlloc*2)
	}

	if heapAlloc > 100*1024*1024 {
		t.Errorf("Heap size too large: %d bytes", heapAlloc)
	}

	_ = totalAlloc / 5000
}

func TestIdiomaticGo(t *testing.T) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	svc2 := analyzer.NewHeavyService()
	if svc2 == nil {
		t.Errorf("NewHeavyService returned nil")
		return
	}
	svc2.Close()

	svc.Ingest(10)
	stats := svc.ReportStatsUnlocked()
	
	if !strings.Contains(stats, "Alloc=") || !strings.Contains(stats, "NumGC=") {
		t.Errorf("ReportStatsUnlocked output not readable")
	}

	// Test that normal operations don't panic
	func() {
		defer func() {
			if r := recover(); r != nil {
				t.Errorf("Panic during normal operation: %v", r)
			}
		}()
		svc.Ingest(100)
		svc.ReportStatsUnlocked()
	}()

	// Check that service has a mutex for thread safety
	svcType := reflect.TypeOf(svc).Elem()
	muField, found := svcType.FieldByName("mu")
	if !found || muField.Type.String() != "sync.Mutex" {
		t.Errorf("No mutex found for thread safety")
	}

	svc3 := analyzer.NewHeavyService()
	done := make(chan bool, 1)
	go func() {
		svc3.Close()
		done <- true
	}()

	select {
	case <-done:
		// ok
	case <-time.After(2 * time.Second):
		t.Errorf("Close() does not complete properly")
	}
}
