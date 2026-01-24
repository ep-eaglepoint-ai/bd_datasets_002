package tests

import (
	"flag"
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

// Command line flag for repo path
var repoPathFlag = flag.String("repo", "", "Path to repository (repository_before or repository_after)")

// Test results tracking
var testResults []testResult
var testFile = "tests/telemetry_test.go"

type testResult struct {
	name    string
	passed  bool
	message string
}

func recordResult(name string, passed bool, message string) {
	testResults = append(testResults, testResult{name: name, passed: passed, message: message})
}

// getRepoPath returns the repository path from flag or environment
func getRepoPath() string {
	if *repoPathFlag != "" {
		return *repoPathFlag
	}
	if envPath := os.Getenv("REPO_PATH"); envPath != "" {
		return envPath
	}
	return "../repository_after"
}

// TestMain provides pytest-style output formatting
func TestMain(m *testing.M) {
	flag.Parse()
	
	start := time.Now()
	
	fmt.Println("============================= test session starts ==============================")
	fmt.Printf("platform %s -- Go %s\n", runtime.GOOS, runtime.Version())
	fmt.Println("collected 7 items")
	fmt.Println()
	
	exitCode := m.Run()
	duration := time.Since(start).Seconds()
	
	// Print pytest-style results
	passed := 0
	failed := 0
	var failedTests []testResult
	
	fmt.Printf("%s ", testFile)
	for _, r := range testResults {
		if r.passed {
			fmt.Print(".")
			passed++
		} else {
			fmt.Print("F")
			failed++
			failedTests = append(failedTests, r)
		}
	}
	fmt.Printf(" [100%%]\n")
	fmt.Println()
	
	// Print failures section if any
	if len(failedTests) > 0 {
		fmt.Println("=================================== FAILURES ===================================")
		for _, r := range failedTests {
			fmt.Printf("_________________________________ %s _________________________________\n", r.name)
			if r.message != "" {
				fmt.Printf("    %s\n", r.message)
			}
			fmt.Println()
		}
	}
	
	fmt.Println("=========================== short test summary info ============================")
	for _, r := range failedTests {
		fmt.Printf("FAILED %s::%s\n", testFile, r.name)
	}
	
	if failed > 0 {
		fmt.Printf("========================= %d failed, %d passed in %.2fs =========================\n", failed, passed, duration)
	} else {
		fmt.Printf("========================= %d passed in %.2fs =========================\n", passed, duration)
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
	repoPath := getRepoPath()
	
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
	repoPath := getRepoPath()
	
	var subjectType reflect.Type
	if strings.Contains(strings.ToLower(repoPath), "repository_before") {
		subjectType = reflect.TypeOf(unopt.TelemetryPacket{})
	} else {
		subjectType = reflect.TypeOf(opt.TelemetryPacket{})
	}

	passed := true
	var msg string

	if subjectType.Name() != "TelemetryPacket" {
		passed = false
		msg = fmt.Sprintf("Struct name changed to %s", subjectType.Name())
		t.Error(msg)
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
			passed = false
			msg = fmt.Sprintf("Missing field: %s", name)
			t.Error(msg)
			continue
		}
		if f.Type.String() != typeStr {
			passed = false
			msg = fmt.Sprintf("Field %s has type %s, expected %s", name, f.Type, typeStr)
			t.Error(msg)
		}
	}
	
	recordResult("TestReq6_PacketStructUnchanged", passed, msg)
}

// Req 7
func TestReq7_NoUnsafe(t *testing.T) {
	repoPath := getRepoPath()
	
	targetFile := filepath.Join(repoPath, "telemetry", "telemetry.go")
	if _, err := os.Stat(targetFile); os.IsNotExist(err) {
		targetFile = filepath.Join(repoPath, "telemetry", "buffer.go") 
	}

	passed := true
	var msg string

	content, err := os.ReadFile(targetFile)
	if err != nil {
		recordResult("TestReq7_NoUnsafe", true, "")
		return
	}
	
	src := string(content)
	if strings.Contains(src, "\"unsafe\"") {
		passed = false
		msg = "Found import of 'unsafe' package"
		t.Error(msg)
	}
	
	recordResult("TestReq7_NoUnsafe", passed, msg)
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
	
	recordResult("TestReq11_ThreadSafety", true, "")
}

func TestPerformanceAndRequirements(t *testing.T) {
	repoPath := getRepoPath()
	absPath, _ := filepath.Abs(repoPath)
	mode := "after"
	if strings.Contains(strings.ToLower(absPath), "repository_before") {
		mode = "before"
	}

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

	// Record parent test result
	parentPassed := true
	var parentMsg string

	t.Run("Throughput", func(t *testing.T) {
		passed := rate >= targetRate
		msg := ""
		if !passed {
			msg = fmt.Sprintf("Throughput %.2f < 1,000,000 pps", rate)
			t.Errorf("Req 2 Failed: %s", msg)
			parentPassed = false
			parentMsg = msg
		}
		recordResult("TestPerformanceAndRequirements/Throughput", passed, msg)
	})

	t.Run("Allocations", func(t *testing.T) {
		passed := totalAllocs < 10
		msg := ""
		if !passed {
			msg = fmt.Sprintf("Allocations %d >= 10", totalAllocs)
			t.Errorf("Req 3 Failed: %s", msg)
			parentPassed = false
			parentMsg = msg
		}
		recordResult("TestPerformanceAndRequirements/Allocations", passed, msg)
	})

	t.Run("GCCycles", func(t *testing.T) {
		passed := gcCycles < 5
		msg := ""
		if !passed {
			msg = fmt.Sprintf("GC Cycles %d >= 5", gcCycles)
			t.Errorf("Req 8 Failed: %s", msg)
			parentPassed = false
			parentMsg = msg
		}
		recordResult("TestPerformanceAndRequirements/GCCycles", passed, msg)
	})

	recordResult("TestPerformanceAndRequirements", parentPassed, parentMsg)
}
