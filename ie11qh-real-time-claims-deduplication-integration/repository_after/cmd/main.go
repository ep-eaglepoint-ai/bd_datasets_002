package main

import (
	claimsdeduplication "claims-deduplication"
	"fmt"
	"log"
	"os"
)

// ClaimsProcessor orchestrates the entire claims processing pipeline
type ClaimsProcessor struct {
	parser       *claimsdeduplication.EDIParser
	deduplicator *claimsdeduplication.ClaimsDeduplicator
	logger       *log.Logger
}

// NewClaimsProcessor creates a new claims processor instance
func NewClaimsProcessor(logger *log.Logger) *ClaimsProcessor {
	return &ClaimsProcessor{
		parser:       claimsdeduplication.NewEDIParser(logger),
		deduplicator: claimsdeduplication.NewClaimsDeduplicator(logger),
		logger:       logger,
	}
}

// ProcessFile processes a single EDI file and returns deduplicated claims
func (cp *ClaimsProcessor) ProcessFile(filePath string) (*claimsdeduplication.DeduplicationResult, error) {
	cp.logger.Printf("Processing file: %s", filePath)
	
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file %s: %w", filePath, err)
	}
	
	claims, err := cp.parser.ParseClaimsFromEDI(string(content))
	if err != nil {
		return nil, fmt.Errorf("failed to parse EDI content from %s: %w", filePath, err)
	}
	
	cp.logger.Printf("Parsed %d claims from file: %s", len(claims), filePath)
	
	result := cp.deduplicator.DeduplicateClaims(claims)
	
	cp.logger.Printf("Processing completed: %d kept claims, %d discarded claims, %d decisions",
		len(result.KeptClaims), len(result.DiscardedClaims), len(result.Decisions))
	
	return result, nil
}

// ProcessMultipleFiles processes multiple EDI files and aggregates results
func (cp *ClaimsProcessor) ProcessMultipleFiles(filePaths []string) (*claimsdeduplication.DeduplicationResult, error) {
	var allClaims []*claimsdeduplication.Claim
	
	// First, parse all claims from all files
	for _, filePath := range filePaths {
		cp.logger.Printf("Processing file: %s", filePath)
		
		content, err := os.ReadFile(filePath)
		if err != nil {
			cp.logger.Printf("Failed to read file %s: %v", filePath, err)
			continue
		}
		
		claims, err := cp.parser.ParseClaimsFromEDI(string(content))
		if err != nil {
			cp.logger.Printf("Failed to parse EDI content from %s: %v", filePath, err)
			continue
		}
		
		cp.logger.Printf("Parsed %d claims from file: %s", len(claims), filePath)
		allClaims = append(allClaims, claims...)
	}
	
	// Then deduplicate all claims together
	cp.logger.Printf("Deduplicating %d total claims", len(allClaims))
	result := cp.deduplicator.DeduplicateClaims(allClaims)
	
	cp.logger.Printf("Overall processing completed: %d total kept claims, %d total discarded claims, %d total decisions",
		len(result.KeptClaims), len(result.DiscardedClaims), len(result.Decisions))
	
	return result, nil
}

// ProcessZipArchives processes claims from multiple zip archives (placeholder for zip handling)
func (cp *ClaimsProcessor) ProcessZipArchives(zipPaths []string) (*DeduplicationResult, error) {
	// In a real implementation, this would extract and process EDI files from zip archives
	// For now, we'll assume the zip paths contain EDI files directly
	return cp.ProcessMultipleFiles(zipPaths)
}

// main function for standalone execution
func main() {
	logger := log.New(os.Stdout, "[CLAIMS_PROCESSOR] ", log.LstdFlags|log.Lshortfile)
	
	if len(os.Args) < 2 {
		logger.Println("Usage: claims-processor <file1> [file2] [file3] ...")
		os.Exit(1)
	}
	
	processor := NewClaimsProcessor(logger)
	
	filePaths := os.Args[1:]
	result, err := processor.ProcessMultipleFiles(filePaths)
	if err != nil {
		logger.Fatalf("Error processing files: %v", err)
	}
	
	// Output summary
	fmt.Printf("\n=== Claims Processing Summary ===\n")
	fmt.Printf("Total Claims Processed: %d\n", len(result.KeptClaims)+len(result.DiscardedClaims))
	fmt.Printf("Unique Claims Kept: %d\n", len(result.KeptClaims))
	fmt.Printf("Duplicate Claims Discarded: %d\n", len(result.DiscardedClaims))
	fmt.Printf("Deduplication Decisions Made: %d\n", len(result.Decisions))
	
	// Output detailed decisions if any were made
	if len(result.Decisions) > 0 {
		fmt.Printf("\n=== Deduplication Decisions ===\n")
		for i, decision := range result.Decisions {
			fmt.Printf("%d. Key: %s\n", i+1, decision.CompositeKey)
			fmt.Printf("   Kept: %s (Submitted: %s)\n", decision.KeptClaimId, decision.KeptSubmissionDate.Format("2006-01-02"))
			fmt.Printf("   Discarded: %s (Submitted: %s)\n", decision.DiscardedClaimId, decision.DiscardedSubmissionDate.Format("2006-01-02"))
			fmt.Printf("   Reason: %s\n\n", decision.ResolutionReason)
		}
	}
}
