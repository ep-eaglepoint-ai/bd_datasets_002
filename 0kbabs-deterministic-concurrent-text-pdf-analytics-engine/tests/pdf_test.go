package tests

import (
	"os"
	"testing"
)

func createPDF(t *testing.T, contentStreams []string) string {
	tmpFile, err := os.CreateTemp("", "test_*.pdf")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	
	tmpFile.WriteString("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n")
	for _, s := range contentStreams {
		tmpFile.WriteString("2 0 obj\n<< >>\nstream\n")
		tmpFile.WriteString(s)
		tmpFile.WriteString("\nendstream\nendobj\n")
	}
	tmpFile.WriteString("%%EOF")
	tmpFile.Close()
	return tmpFile.Name()
}

func TestPDFSimple(t *testing.T) {
	path := createPDF(t, []string{"BT /F1 12 Tf (Hello World) Tj ET"})
	defer os.Remove(path)

	output, err := RunAnalyzer(t, TargetExe, path)
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	if counts["hello"] != 1 {
		t.Errorf("Expected hello=1, got %d", counts["hello"])
	}
	if counts["world"] != 1 {
		t.Errorf("Expected world=1, got %d", counts["world"])
	}
}

func TestPDFEscapes(t *testing.T) {
	path := createPDF(t, []string{"BT (He\\)llo) Tj (Wo\\\\rld) Tj ET"})
	defer os.Remove(path)

	output, err := RunAnalyzer(t, TargetExe, path)
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	// Assumes tokenizer extracts "He)llo" -> "he", "llo" or similar based on \w
	if counts["he"] != 1 || counts["llo"] != 1 {
		t.Errorf("Escaped matching failed for He)llo: %v", counts)
	}
	// "Wo\\rld" -> "Wo\rld" -> words: "wo", "rld"
	if counts["wo"] != 1 || counts["rld"] != 1 {
		t.Errorf("Escaped matching failed for Wo\\rld: %v", counts)
	}
}

func TestPDFNestedObjects(t *testing.T) {
	path := createPDF(t, []string{"<< /K << /S (Ignore) >> >> BT (RealText) ET"})
	defer os.Remove(path)

	output, err := RunAnalyzer(t, TargetExe, path)
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	if _, ok := counts["realtext"]; !ok {
		t.Error("Failed to extract RealText")
	}
	if _, ok := counts["ignore"]; ok {
		t.Error("Incorrectly extracted text outside BT block")
	}
}

func TestPDFFakeBT(t *testing.T) { 
	path := createPDF(t, []string{"BT (Fake BT Start) Tj ET"})
	defer os.Remove(path)

	output, err := RunAnalyzer(t, TargetExe, path)
	if err != nil {
		t.Fatalf("Analyzer failed: %v", err)
	}

	counts := ParseReport(output)
	// Should see "fake", "bt", "start"
	if counts["fake"] != 1 || counts["bt"] != 1 || counts["start"] != 1 {
		t.Errorf("Failed to handle BT inside string: %v", counts)
	}
}
