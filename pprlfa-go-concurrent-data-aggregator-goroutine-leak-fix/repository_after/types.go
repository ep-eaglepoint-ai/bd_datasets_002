package aggregator

type DataSource struct {
	ID   string
	URL  string
}

type Result struct {
	SourceID string
	Data     []byte
	Error    error
}

type AggregatedResult struct {
	Results []Result
	Errors  []error
}
