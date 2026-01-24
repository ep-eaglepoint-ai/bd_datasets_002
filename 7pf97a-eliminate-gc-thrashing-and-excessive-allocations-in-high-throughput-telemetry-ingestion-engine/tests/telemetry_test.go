package tests

import (
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	opt "repository_after/telemetry"
	unopt "scenario-008-go-slice-realloc/telemetry"
)

// TestMain provides pytest-style output formatting
func TestMain(m *testing.M) {
	fmt.Println("============================= test session starts ==============================")
	fmt.Printf("platform %s -- Go %s\n", runtime.GOOS, runtime.Version())
	fmt.Println("collecting items...")
	fmt.Println()

	start := time.Now()
	exitCode := m.Run()
	duration := time.Since(start).Seconds()

	fmt.Println()
	fmt.Println("=========================== short test summary info ============================")
	if exitCode == 0 {
		fmt.Printf("========================= passed in %.2fs =========================\n", duration)
	} else {
		fmt.Printf("========================= FAILED in %.2fs =========================\n", duration)
	}

	os.Exit(exitCode)
}

type IngestionBuffer interface {
	Push(p interface{})
	Flush() interface{}
}

type OptWrapper struct {
	buf *opt.IngestionBuffer
}

func (w *OptWrapper) Push(p interface{}) {
	w.buf.Push(p.(opt.TelemetryPacket))
}
func (w *OptWrapper) Flush() interface{} {
	return w.buf.Flush()
}

type UnoptWrapper struct {
	buf *unopt.IngestionBuffer
}

func (w *UnoptWrapper) Push(p interface{}) {
	w.buf.Push(p.(unopt.TelemetryPacket))
}
func (w *UnoptWrapper) Flush() interface{} {
	return w.buf.Flush()
}

func getBuffer(t *testing.T, capacity int) (IngestionBuffer, string) {
	repoPath := os.Getenv("REPO_PATH")
	if repoPath == "" {
		
		repoPath = "../repository_after"
	}
	
	absPath, err := filepath.Abs(repoPath)
	if err != nil {
		t.Fatalf("Invalid REPO_PATH: %v", err)
	}

	if strings.Contains(strings.ToLower(absPath), "repository_before") {
		return &UnoptWrapper{buf: unopt.NewIngestionBuffer()}, "before"
	}
	
	return &OptWrapper{buf: opt.NewIngestionBuffer(capacity)}, "after"
}

// Req 6: Must not modify the existing TelemetryPacket struct
func TestReq6_PacketStructUnchanged(t *testing.T) {

	
	repoPath := os.Getenv("REPO_PATH")
	if repoPath == "" {
		repoPath = "../repository_after"
	}
	
	var subjectType reflect.Type
	if strings.Contains(strings.ToLower(repoPath), "repository_before") {
		subjectType = reflect.TypeOf(unopt.TelemetryPacket{})
	} else {
		subjectType = reflect.TypeOf(opt.TelemetryPacket{})
	}

	if subjectType.Name() != "TelemetryPacket" {
		t.Errorf("Struct name changed to %s", subjectType.Name())
	}
	
	expectedFields := map[string]string{
		"ID":        "int",
		"Timestamp": "int64",
		"Value":     "float64",
		"Payload":   "[64]uint8",
	}
	
	for name, typeStr := range expectedFields {
		f, ok := subjectType.FieldByName(name)
		if !ok {
			t.Errorf("Missing field: %s", name)
			continue
		}
		if f.Type.String() != typeStr {
			t.Errorf("Field %s has type %s, expected %s", name, f.Type, typeStr)
		}
	}
}

// Req 7
func TestReq7_NoUnsafe(t *testing.T) {
	repoPath := os.Getenv("REPO_PATH")
	if repoPath == "" {
		repoPath = "../repository_after"
	}
	
	targetFile := filepath.Join(repoPath, "telemetry", "telemetry.go")
	if _, err := os.Stat(targetFile); os.IsNotExist(err) {
		targetFile = filepath.Join(repoPath, "telemetry", "buffer.go") 
	}

	content, err := os.ReadFile(targetFile)
	if err != nil {
		t.Logf("Could not read source file for unsafe check: %v", err)
		return
	}
	
	src := string(content)
	if strings.Contains(src, "\"unsafe\"") {
		t.Error("Found import of 'unsafe' package")
	}
}

// Req 11
func TestReq11_ThreadSafety(t *testing.T) {
	buffer, mode := getBuffer(t, 500000)

	var wg sync.WaitGroup
	packetCount := 50000
	workers := 4
	timestamp := int64(1700000000000000000)

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for i := 0; i < packetCount; i++ {
				if mode == "before" {
					buffer.Push(unopt.TelemetryPacket{ID: i, Timestamp: timestamp})
				} else {
					buffer.Push(opt.TelemetryPacket{ID: i, Timestamp: timestamp})
				}
			}
		}(w)
	}
	
	finishCh := make(chan bool)
	go func() {
		for {
			select {
			case <-finishCh:
				return
			default:
				buffer.Flush()
				time.Sleep(5 * time.Millisecond)
			}
		}
	}()

	wg.Wait()
	finishCh <- true
	
}

func TestPerformanceAndRequirements(t *testing.T) {
	repoPath := os.Getenv("REPO_PATH")
	if repoPath == "" {
		repoPath = "../repository_after"
	}
	absPath, _ := filepath.Abs(repoPath)
	mode := "after"
	if strings.Contains(strings.ToLower(absPath), "repository_before") {
		mode = "before"
	}
	t.Logf("Testing Mode: %s", mode)

	count := 1000000
	var elapsed float64
	var m1, m2 runtime.MemStats

	if mode == "before" {
		buf := unopt.NewIngestionBuffer()
		packet := unopt.TelemetryPacket{ID: 1, Value: 1.0}
		runtime.GC()
		time.Sleep(100 * time.Millisecond)
		runtime.ReadMemStats(&m1)
		start := time.Now()
		for i := 0; i < count; i++ {
			buf.Push(packet)
			if i%1024 == 0 {
				_ = buf.Flush()
			}
		}
		elapsed = time.Since(start).Seconds()
		runtime.ReadMemStats(&m2)
	} else {
		buf := opt.NewIngestionBuffer(4096)
		packet := opt.TelemetryPacket{ID: 1, Value: 1.0}
		runtime.GC()
		time.Sleep(100 * time.Millisecond)
		runtime.ReadMemStats(&m1)
		start := time.Now()
		for i := 0; i < count; i++ {
			buf.Push(packet)
			if i%1024 == 0 {
				_ = buf.Flush()
			}
		}
		elapsed = time.Since(start).Seconds()
		runtime.ReadMemStats(&m2)
	}

	totalAllocs := m2.Mallocs - m1.Mallocs
	gcCycles := m2.NumGC - m1.NumGC
	rate := float64(count) / elapsed
	targetRate := 1000000.0

	t.Logf("Throughput: %.2f packets/sec", rate)
	t.Logf("Total Allocations: %d", totalAllocs)
	t.Logf("GC Cycles: %d", gcCycles)

	t.Run("Throughput", func(t *testing.T) {
		if rate < targetRate {
			t.Errorf("Req 2 Failed: Throughput %.2f < 1,000,000 pps", rate)
		}
	})

	t.Run("Allocations", func(t *testing.T) {
		if totalAllocs >= 10 {
			t.Errorf("Req 3 Failed: Allocations %d >= 10", totalAllocs)
		}
	})

	t.Run("GCCycles", func(t *testing.T) {
		if gcCycles >= 5 {
			t.Errorf("Req 8 Failed: GC Cycles %d >= 5", gcCycles)
		}
	})
}




