package tests

import (
	"bytes"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func getRepoPath(t *testing.T) string {
	path := os.Getenv("REPO_PATH")
	if path == "" {
		// Fallback for local testing
		path = "repository_after"
	}
	// We are running from 'tests' directory, so we need to go up one level
	absPath, _ := filepath.Abs(filepath.Join("..", path, "main.go"))
	return absPath
}

func getAST(t *testing.T) *ast.File {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, getRepoPath(t), nil, 0)
	if err != nil {
		t.Fatalf("Failed to parse main.go: %v", err)
	}
	return node
}

func getCode(t *testing.T) string {
	content, err := os.ReadFile(getRepoPath(t))
	if err != nil {
		t.Fatalf("Failed to read main.go: %v", err)
	}
	return string(content)
}

// 1. The Plugin interface signature must be changed to return error (standard interface)
func TestRequirement1_InterfaceSignature(t *testing.T) {
	node := getAST(t)
	found := false
	ast.Inspect(node, func(n ast.Node) bool {
		if ts, ok := n.(*ast.TypeSpec); ok && ts.Name.Name == "Plugin" {
			if it, ok := ts.Type.(*ast.InterfaceType); ok {
				for _, m := range it.Methods.List {
					if ft, ok := m.Type.(*ast.FuncType); ok {
						if len(ft.Results.List) == 1 {
							if id, ok := ft.Results.List[0].Type.(*ast.Ident); ok && id.Name == "error" {
								found = true
							}
						}
					}
				}
			}
		}
		return true
	})
	if !found {
		t.Error("Requirement 1: Plugin interface must return standard error interface")
	}
}

// 2. The stats map must be protected by a sync.RWMutex or replaced with sync/atomic counters
func TestRequirement2_StatsMapProtection(t *testing.T) {
	code := getCode(t)
	if !strings.Contains(code, "mu.Lock()") && !strings.Contains(code, "pm.mu.Lock()") {
		t.Error("Requirement 2: stats map access must be protected (lock found: false)")
	}
}

// 3. The resultChan must be buffered (make(chan error, 1))
func TestRequirement3_BufferedChannel(t *testing.T) {
	code := getCode(t)
	if !strings.Contains(code, "make(chan error, 1)") {
		t.Error("Requirement 3: resultChan must be buffered to avoid leaks")
	}
}

// 4. The ProcessTransaction signature should ideally update to accept context.Context
func TestRequirement4_ContextInSignature(t *testing.T) {
	node := getAST(t)
	found := false
	ast.Inspect(node, func(n ast.Node) bool {
		if fd, ok := n.(*ast.FuncDecl); ok && fd.Name.Name == "ProcessTransaction" {
			if len(fd.Type.Params.List) > 0 {
				p := fd.Type.Params.List[0]
				if se, ok := p.Type.(*ast.SelectorExpr); ok {
					if id, ok := se.X.(*ast.Ident); ok && id.Name == "context" && se.Sel.Name == "Context" {
						found = true
					}
				}
			}
		}
		return true
	})
	if !found {
		t.Error("Requirement 4: ProcessTransaction should accept context.Context")
	}
}

// 5. The final code, when run with "good_input", must print "Transaction SUCCESS"
func TestRequirement5_GoodInputSuccess(t *testing.T) {
	cmd := exec.Command("go", "run", getRepoPath(t))
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		t.Fatalf("go run failed: %v", err)
	}
	if !strings.Contains(out.String(), "Transaction SUCCESS") {
		t.Error("Requirement 5: Output must contain 'Transaction SUCCESS'")
	}
}

// 6. The loop inside the goroutine must correctly handle the error
func TestRequirement6_ErrorHandlingInGoroutine(t *testing.T) {
	code := getCode(t)
	if !strings.Contains(code, "resultChan <- err") {
		t.Error("Requirement 6: Errors must be sent to resultChan inside the goroutine")
	}
}

// 7. The refactored code should typically implement a Mutex inside the PluginManager struct
func TestRequirement7_MutexInStruct(t *testing.T) {
	node := getAST(t)
	found := false
	ast.Inspect(node, func(n ast.Node) bool {
		if ts, ok := n.(*ast.TypeSpec); ok && ts.Name.Name == "PluginManager" {
			if st, ok := ts.Type.(*ast.StructType); ok {
				for _, f := range st.Fields.List {
					if se, ok := f.Type.(*ast.SelectorExpr); ok {
						if id, ok := se.X.(*ast.Ident); ok && id.Name == "sync" && (se.Sel.Name == "RWMutex" || se.Sel.Name == "Mutex") {
							found = true
						}
					}
					for _, name := range f.Names {
						if name.Name == "mu" {
							found = true
						}
					}
				}
			}
		}
		return true
	})
	if !found {
		t.Error("Requirement 7: PluginManager struct must contain a Mutex/RWMutex")
	}
}

// 8. Cancellation Propagation: check ctx.Done() between iterations
func TestRequirement8_CancellationPropagation(t *testing.T) {
	code := getCode(t)
	if !strings.Contains(code, "case <-ctx.Done():") {
		t.Error("Requirement 8: Cancellation propagation check (ctx.Done()) missing")
	}
}

// 9. Error Type Fidelity: preserve the custom PluginError type information
func TestRequirement9_ErrorTypeFidelity(t *testing.T) {
	cmd := exec.Command("go", "run", getRepoPath(t))
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Run()
	if !strings.Contains(out.String(), "Successfully recovered PluginError") {
		t.Error("Requirement 9: FAILED to recover custom PluginError type")
	}
}
