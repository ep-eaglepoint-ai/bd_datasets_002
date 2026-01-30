package service

import (
	"fmt"
	"net/http"
)

func ValidateFileType(header []byte) error {
	contentType := http.DetectContentType(header)

	allowed := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/gif":  true,
		"application/pdf": true,
		"text/plain; charset=utf-8": true,
	}
	// Note: For strict requirements, we should narrow this. 
	// But "invalid types" usually implies a blacklist or specific strict whitelist. 
	// I'll keep it broad but demonstrate the check.
	// Actually, let's allow everything EXCEPT specific bad ones if we want, or whitelist.
	// Let's assume whitelist.
	
	if !allowed[contentType] {
		// Allow it if it's text/plain (sometimes charset varies)
		return fmt.Errorf("invalid file type: %s", contentType)
	}
	
	return nil
}
