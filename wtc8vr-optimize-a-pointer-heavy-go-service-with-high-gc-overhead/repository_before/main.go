package main

import "gocode/analyzer"

func main() {
	service := analyzer.NewHeavyService()
	defer service.Close()

	for i := 0; i < 5; i++ {
		service.Ingest(5000)
		analyzer.ReportStats()
	}
}
