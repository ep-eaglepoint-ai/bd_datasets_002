package main

// crypto/md5: Used to generate a checksum of the original URL.
import (
	"crypto/md5"
	"encoding/hex"
)

// fmt: Used for string formatting and console output.

// encoding/hex: Used to convert the binary hash into a readable string.

// Global storage - NOT thread-safe
var urlStore = make(map[string]string)

func Shorten(url string) string {
	// Problem: MD5 is slow for this use case and produces long strings
	hasher := md5.New()
	hasher.Write([]byte(url))
	fullHash := hex.EncodeToString(hasher.Sum(nil))

	// Problem: Simply taking the first 6 chars increases collision probability
	// Problem: No check if the short key already exists for a DIFFERENT long URL
	shortKey := fullHash[:6]

	urlStore[shortKey] = url
	return shortKey
}

func Resolve(shortKey string) string {
	return urlStore[shortKey]
}
