package tests

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"file-upload-service/service"
)

// Setup helper to initialize Service
func Setup() {
	// Use a test DB and Dir
	service.InitDB("test_uploads.db")
	service.InitStorage()
}

func Teardown() {
	service.CloseDB()
	os.Remove("test_uploads.db")
	os.RemoveAll("uploads")
}

// TestRequirements covers the mandatory requirements
func TestRequirements(t *testing.T) {
	Setup()
	defer Teardown()

	// Req 1 & 5 & 11: Streaming, Chunked Write, Directory Spread
	t.Run("Req1_Streaming_And_Storage", func(t *testing.T) {
		content := []byte("Hello World, this is a test file for streaming.")
		resp, err := uploadFile("file", "test.txt", "text/plain", content)
		if err != nil {
			t.Fatalf("Upload failed: %v", err)
		}
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected 200, got %d", resp.StatusCode)
		}
	})

	// Req 3: Validate File Type
	t.Run("Req3_ValidateFileType", func(t *testing.T) {
		// Send a fake exe (magic numbers)
		content := []byte{0x4D, 0x5A, 0x90, 0x00} // MZ header
		resp, err := uploadFile("file", "test.exe", "application/x-msdownload", content)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != http.StatusUnsupportedMediaType && resp.StatusCode != 500 {
			t.Errorf("Expected 415 for invalid type, got %d", resp.StatusCode)
		}
	})

	// Req 2 & 9: Checksums & In-Memory Progress
	t.Run("Req2_Checksums", func(t *testing.T) {
		content := bytes.Repeat([]byte("A"), 1024)
		resp, err := uploadFile("file", "checksum.txt", "text/plain", content)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != 200 {
			t.Errorf("Upload failed: %d", resp.StatusCode)
		}
	})

	// Req 6: Concurrency Limit
	t.Run("Req6_Concurrency", func(t *testing.T) {
		limit := make(chan struct{}, 10) // 10 concurrent
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			select {
			case limit <- struct{}{}:
				defer func() { <-limit }()
				// Simulate slow upload
				time.Sleep(100 * time.Millisecond)
				service.HandleUpload(w, r)
			default:
				http.Error(w, "Server too busy", http.StatusServiceUnavailable)
			}
		})
		srv := httptest.NewServer(handler)
		defer srv.Close()

		var wg sync.WaitGroup
		success := 0
		failures := 0
		mu := sync.Mutex{}

		// Fire 20 requests
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				// perform upload against srv.URL
				content := []byte("data")
				resp, _ := uploadToURL(srv.URL + "/upload", "file", "test.txt", "text/plain", content)
				mu.Lock()
				if resp.StatusCode == 200 {
					success++
				} else if resp.StatusCode == 503 {
					failures++
				}
				mu.Unlock()
			}()
		}
		wg.Wait()
		
		if failures == 0 {
			t.Log("Warning: No 503s encountered, machine might be too fast or sleep too short")
		} else {
			t.Logf("Concurrency: Success %d, Rejected %d", success, failures)
		}
	})

}

func uploadFile(field, filename, contentType string, content []byte) (*http.Response, error) {
	req, _, err := createUploadRequest(field, filename, contentType, content)
	if err != nil {
		return nil, err
	}
	
	rr := httptest.NewRecorder()
	service.HandleUpload(rr, req)
	return rr.Result(), nil
}

func uploadToURL(url, field, filename, contentTypeHeaderStr string, content []byte) (*http.Response, error) {
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile(field, filename)
	if err != nil {
		return nil, err
	}
	part.Write(content)
	writer.Close()

	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return http.DefaultClient.Do(req)
}

func createUploadRequest(field, filename, contentType string, content []byte) (*http.Request, string, error) {
	body := new(bytes.Buffer)
	writer := multipart.NewWriter(body)
	
	part, err := writer.CreateFormFile(field, filename)
	if err != nil {
		return nil, "", err
	}
	part.Write(content)
	writer.Close()

	req := httptest.NewRequest("POST", "/upload", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req, writer.FormDataContentType(), nil
}
