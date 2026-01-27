package main

import (
	"fmt"

	"concat/concat"
)

func main() {
	items := []string{"hello", " ", "world", "!"}
	result := concat.ConcatAwful(items)
	fmt.Println(result)
}
