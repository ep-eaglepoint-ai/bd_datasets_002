package concat

import (
	"strings"
)

func Concat(items []string) string {
	if len(items) == 0 {
		return ""
	}

	// Pre-calculating total length allows for a single memory allocation.
	totalLen := 0
	for _, s := range items {
		totalLen += len(s)
	}
	// the builder will have enough capacity to hold all strings
	var builder strings.Builder
	builder.Grow(totalLen)

	for _, s := range items {
		builder.WriteString(s)
	}

	return builder.String()
}