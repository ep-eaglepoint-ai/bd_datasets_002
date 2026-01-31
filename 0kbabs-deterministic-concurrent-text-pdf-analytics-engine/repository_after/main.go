package main

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"unicode"
)

// Config holds configuration for the Analyzer
type Config struct {
	MaxWorkers int
}

// Analyzer encapsulates the state and logic for processing documents.
type Analyzer struct {
	registry map[string]*uint64
	mu       sync.RWMutex

	config Config
}

// NewAnalyzer creates a new Analyzer instance.
func NewAnalyzer() *Analyzer {
	return &Analyzer{
		registry: make(map[string]*uint64),
		config: Config{
			MaxWorkers: 8, // Default worker count
		},
	}
}

// main is the entry point.
func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: analyzer <file>\n")
		os.Exit(1)
	}

	inputFile := os.Args[1]
	file, err := os.Open(inputFile)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error opening file: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()

	analyzer := NewAnalyzer()

	// Determine file type
	ext := getExtension(inputFile)
	var processErr error

	if ext == "pdf" {
		processErr = analyzer.ProcessPDF(file)
	} else {
		processErr = analyzer.ProcessText(file)
	}

	if processErr != nil {
		fmt.Fprintf(os.Stderr, "Error processing file: %v\n", processErr)
		os.Exit(1)
	}

	analyzer.PrintReport()
}

func getExtension(path string) string {
	parts := strings.Split(path, ".")
	if len(parts) > 1 {
		return strings.ToLower(parts[len(parts)-1])
	}
	return ""
}

// ProcessText processes a plain text stream using a worker pool pattern.
func (a *Analyzer) ProcessText(r io.Reader) error {
	scanner := bufio.NewScanner(r)
	// Set a reasonable buffer size for lines, can handle long lines by growing
	const maxCapacity = 1024 * 1024 // 1MB line limit for sanity, though Scanner grows automatically
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, maxCapacity)

	// Worker pool setup
	linesCh := make(chan string, 100)
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < a.config.MaxWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for line := range linesCh {
				a.normalizeAndCount(line)
			}
		}()
	}

	// Stream lines to workers
	for scanner.Scan() {
		// Make a copy of the string to avoid any scanner buffer race issues (though Text() returns a string copy usually)
		// scanner.Text() allocates a new string, so it's safe to pass to channel.
		line := scanner.Text()
		linesCh <- line
	}

	close(linesCh)
	wg.Wait()

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scanner error: %w", err)
	}

	return nil
}

// normalizeAndCount extracts words and updates the registry.
// This function is safe for concurrent use.
func (a *Analyzer) normalizeAndCount(text string) {
	var wordBuilder strings.Builder
	runes := []rune(text)

	for i := 0; i < len(runes); i++ {
		r := runes[i]
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '\'' {
			wordBuilder.WriteRune(unicode.ToLower(r))
		} else {
			if wordBuilder.Len() > 0 {
				a.addWord(wordBuilder.String())
				wordBuilder.Reset()
			}
		}
	}
	// Flush last word
	if wordBuilder.Len() > 0 {
		a.addWord(wordBuilder.String())
	}
}

func (a *Analyzer) addWord(w string) {
	a.mu.RLock()
	ptr, ok := a.registry[w]
	a.mu.RUnlock()

	if ok {
		atomic.AddUint64(ptr, 1)
		return
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	// Double check
	ptr, ok = a.registry[w]
	if ok {
		atomic.AddUint64(ptr, 1)
	} else {
		val := uint64(1)
		a.registry[w] = &val
	}
}

func (a *Analyzer) ProcessPDF(r io.Reader) error {
	reader := bufio.NewReader(r)

	// State definitions
	const (
		StateNone = iota
		StateInBT
		StateInString
		StateEscape
		StateInComment
		StateInDict
		StateInName
	)

	state := StateNone
	stateStack := []int{}

	push := func(s int) {
		stateStack = append(stateStack, s)
	}

	pop := func() int {
		if len(stateStack) == 0 {
			return StateNone
		}
		s := stateStack[len(stateStack)-1]
		stateStack = stateStack[:len(stateStack)-1]
		return s
	}

	peekStack := func() int {
		if len(stateStack) == 0 {
			return StateNone
		}
		return stateStack[len(stateStack)-1]
	}

	parenDepth := 0
	angleDepth := 0

	var stringContent strings.Builder

	isDelimiter := func(b byte) bool {
		switch b {
		case '(', ')', '<', '>', '[', ']', '{', '}', '/', '%':
			return true
		default:
			return unicode.IsSpace(rune(b))
		}
	}

	for {
		b, err := reader.ReadByte()
		if err != nil {
			if err == io.EOF {
				break
			}
			return err
		}

		switch state {
		case StateNone, StateInBT, StateInDict:
			if b == '%' {
				push(state)
				state = StateInComment
				continue
			}
			if b == '(' {
				push(state)
				state = StateInString
				parenDepth = 1
				if peekStack() == StateInBT {
					stringContent.Reset()
				}
				continue
			}
			if b == '<' {
				next, err := reader.Peek(1)
				if err == nil && next[0] == '<' {
					reader.ReadByte()
					if state == StateInDict {
						angleDepth++
					} else {
						push(state)
						state = StateInDict
						angleDepth = 1
					}
				}
				continue
			}
			if b == '>' {
				// Check for >>
				if state == StateInDict {
					next, err := reader.Peek(1)
					if err == nil && next[0] == '>' {
						reader.ReadByte() // Consume second >
						angleDepth--
						if angleDepth == 0 {
							state = pop()
						}
					}
				}
				continue
			}
			if b == '/' {
				push(state)
				state = StateInName
				continue
			}

			// Specific Logic
			if state == StateNone {
				if b == 'B' {
					next, err := reader.Peek(1)
					if err == nil && next[0] == 'T' {
						reader.ReadByte()
						state = StateInBT
					}
				}
			} else if state == StateInBT {
				if b == 'E' {
					next, err := reader.Peek(1)
					if err == nil && next[0] == 'T' {
						reader.ReadByte()
						state = StateNone
					}
				}
			}

		case StateInString:
			if b == '\\' {
				state = StateEscape
				continue
			}
			if b == '(' {
				parenDepth++
				if peekStack() == StateInBT {
					stringContent.WriteByte(b)
				}
			} else if b == ')' {
				parenDepth--
				if parenDepth == 0 {
					// End string
					if peekStack() == StateInBT {
						a.normalizeAndCount(stringContent.String())
					}
					state = pop()
				} else {
					if peekStack() == StateInBT {
						stringContent.WriteByte(b)
					}
				}
			} else {
				if peekStack() == StateInBT {
					stringContent.WriteByte(b)
				}
			}

		case StateEscape:
			if peekStack() == StateInBT {
				stringContent.WriteByte(b)
			}
			state = StateInString

		case StateInComment:
			if b == '\r' || b == '\n' {
				state = pop()
			}

		case StateInName:
			if isDelimiter(b) {
				reader.UnreadByte()
				state = pop()
			}
		}
	}

	return nil
}

// PrintReport prints the analytics report to stdout.
func (a *Analyzer) PrintReport() {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Convert map to slice for sorting
	type pair struct {
		word  string
		count uint64
	}
	results := make([]pair, 0, len(a.registry))

	for k, v := range a.registry {
		results = append(results, pair{k, atomic.LoadUint64(v)})
	}

	sort.SliceStable(results, func(i, j int) bool {
		if results[i].count == results[j].count {
			return results[i].word < results[j].word
		}
		return results[i].count > results[j].count
	})

	fmt.Printf("--- Analytics Report (Total Pkgs: %d) ---\n", len(results))
	for i := range results {
		fmt.Printf("%s: %d\n", results[i].word, results[i].count)
	}
}
