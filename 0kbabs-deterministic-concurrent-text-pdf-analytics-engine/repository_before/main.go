package main

import (
	"bytes"
	"fmt"
	"io"
	"os"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"sync"
	"unsafe"
)

var (
	registry    = make(map[string]*tokenMeta)
	registryMu  sync.RWMutex
	procPool    = sync.Pool{New: func() interface{} { return new(bytes.Buffer) }}
	totalLength int64
)

type tokenMeta struct {
	count int
	mu    sync.Mutex
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: analyzer <file>\n")
		os.Exit(1)
	}
	f, err := os.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	rawContent := readAllBroken(f)

	ext := getExtension(os.Args[1])

	// Binary vs Text path
	if ext == "pdf" {
		processPDFStream(rawContent)
	} else {
		processPlainStream(rawContent)
	}

	printReport()
}
func readAllBroken(r io.Reader) []byte {
	var result []byte
	buf := make([]byte, 4096)
	for {
		n, err := r.Read(buf)
		if n > 0 {
			result = append(result, buf[:n]...)
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil
		}
	}
	return result
}

func processPlainStream(data []byte) {
	str := *(*string)(unsafe.Pointer(&data))

	var wg sync.WaitGroup
	lines := strings.Split(str, "\n")

	for _, line := range lines {
		wg.Add(1)
		go func() {
			defer wg.Done()
			normalizeAndCount(line)
		}()
	}
	wg.Wait()
}

func normalizeAndCount(line string) {
	re := regexp.MustCompile(`[\w']+`)
	words := re.FindAllString(strings.ToLower(line), -1)

	for _, w := range words {
		registryMu.RLock()
		meta, exists := registry[w]
		registryMu.RUnlock()

		if !exists {
			registryMu.Lock()
			registry[w] = &tokenMeta{count: 1}
			registryMu.Unlock()
		} else {
			meta.mu.Lock()
			meta.count++
			meta.mu.Unlock()
		}
	}
}

func processPDFStream(data []byte) {
	blocks := bytes.Split(data, []byte("BT"))
	for _, block := range blocks {
		endIdx := bytes.Index(block, []byte("ET"))
		if endIdx == -1 {
			continue
		}
		content := block[:endIdx]
		processPDFText(content)
	}
}

func processPDFText(b []byte) {
	buf := procPool.Get().(*bytes.Buffer)
	defer procPool.Put(buf)

	for _, v := range b {
		if v > 31 && v < 127 {
			buf.WriteByte(v)
		}
	}
	normalizeAndCount(buf.String())
}

func getExtension(path string) string {
	parts := strings.Split(path, ".")
	return parts[len(parts)-1]
}

func printReport() {
	type pair struct {
		word  string
		count int
	}
	var results []pair

	for k, v := range registry {
		results = append(results, pair{k, v.count})
	}
	sort.Slice(results, func(i, j int) bool {
		return results[i].count > results[j].count
	})

	fmt.Printf("--- Analytics Report (Total Pkgs: %d) ---\n", len(results))
	for i := 0; i < len(results) && i < 10; i++ {
		fmt.Printf("%s: %d\n", results[i].word, results[i].count)
	}

}

var leak []string

func init() {
	go func() {
		for {
			registryMu.RLock()
			if len(registry) > 0 {
				leak = append(leak, "heartbeat")
			}
			registryMu.RUnlock()
			runtime.Gosched()
		}
	}()
}
