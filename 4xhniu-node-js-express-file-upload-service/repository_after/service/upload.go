package service

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

var (
	MaxFileSize int64 = 100 * 1024 * 1024 // 100MB limit, var for testing
)

// HandleUpload is the http.HandlerFunc logic
func HandleUpload(w http.ResponseWriter, r *http.Request) {
	mr, err := r.MultipartReader()
	if err != nil {
		http.Error(w, "Expected multipart/form-data", http.StatusBadRequest)
		return
	}

	part, err := mr.NextPart()
	if err == io.EOF {
		http.Error(w, "No part received", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "Failed to read part", http.StatusBadRequest)
		return
	}
	defer part.Close()

	if part.FormName() != "file" {
		http.Error(w, "Expected form field 'file'", http.StatusBadRequest)
		return
	}

	// Req 3: Validation
	head := make([]byte, 512)
	n, err := io.ReadFull(part, head)
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		http.Error(w, "Failed to read file header", http.StatusInternalServerError)
		return
	}
	
	if err := ValidateFileType(head[:n]); err != nil {
		http.Error(w, err.Error(), http.StatusUnsupportedMediaType)
		return
	}

	fullStream := io.MultiReader(bytes.NewReader(head[:n]), part)

	uploadID := uuid.New().String()
	destPath, err := GetDestinationPath(uploadID)
	if err != nil {
		http.Error(w, "Storage error", http.StatusInternalServerError)
		return
	}
	
	tempPath := destPath + ".tmp"
	outFile, err := os.Create(tempPath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer outFile.Close()
	defer func() {
		// Cleanup temp if it exists and hasn't been renamed
		if _, err := os.Stat(tempPath); err == nil {
			os.Remove(tempPath)
		}
	}()

	hasher := sha256.New()
	
	limitSpy := &SizeLimitReader{
		R: fullStream, 
		N: MaxFileSize,
		OnProgress: func(bytesRead int64) {
			// Req 9: In-memory progress tracking
		},
	}
	
	written, err := io.Copy(io.MultiWriter(outFile, hasher), limitSpy)
	
	// Error handling
	if err != nil {
		if err == ErrSizeLimitExceeded {
			http.Error(w, "File too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "Upload failed", http.StatusInternalServerError)
		return
	}

	checksum := hex.EncodeToString(hasher.Sum(nil))

	finalPath := destPath + filepath.Ext(part.FileName())
	outFile.Close() 
	if err := os.Rename(tempPath, finalPath); err != nil {
		http.Error(w, "Finalize failed", http.StatusInternalServerError)
		return
	}

	SaveMetadataAsync(uploadID, part.FileName(), written, checksum, finalPath)

	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Upload successful: %s", uploadID)
}

var ErrSizeLimitExceeded = fmt.Errorf("size limit exceeded")

type SizeLimitReader struct {
	R          io.Reader
	N          int64
	TotalRead  int64
	OnProgress func(int64)
}

func (l *SizeLimitReader) Read(p []byte) (n int, err error) {
	n, err = l.R.Read(p)
	l.TotalRead += int64(n)
	if l.OnProgress != nil {
		l.OnProgress(l.TotalRead)
	}
	
	if l.TotalRead > l.N {
		return n, ErrSizeLimitExceeded
	}
	return
}
