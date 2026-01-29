package tests

import (
	"testing"

	"gocode/analyzer"
)

// BenchmarkIngest measures allocations and throughput for ingesting records
func BenchmarkIngest(b *testing.B) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		svc.Ingest(100)
	}
}

// BenchmarkIngestLarge measures performance for larger ingest batches
func BenchmarkIngestLarge(b *testing.B) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		svc.Ingest(1000)
	}
}

// BenchmarkIngestSingle measures overhead per single record
func BenchmarkIngestSingle(b *testing.B) {
	svc := analyzer.NewHeavyService()
	defer svc.Close()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		svc.Ingest(1)
	}
}

