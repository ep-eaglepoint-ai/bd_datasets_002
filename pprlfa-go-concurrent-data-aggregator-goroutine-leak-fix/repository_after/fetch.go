package aggregator

import (
	"errors"
	"fmt"
	"time"
)

func fetchFromSource(source DataSource) ([]byte, error) {
	time.Sleep(100 * time.Millisecond)
	if source.ID == "source_3" {
		return nil, errors.New("connection timeout")
	}
	return []byte(fmt.Sprintf("data from %s", source.ID)), nil
}
