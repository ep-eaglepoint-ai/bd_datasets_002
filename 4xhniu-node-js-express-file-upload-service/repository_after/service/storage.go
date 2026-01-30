package service

import (
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	UploadDir = "uploads"
)

func InitStorage() {
	os.MkdirAll(UploadDir, 0755)
}

func GetDestinationPath(id string) (string, error) {
	now := time.Now()
	subDir := filepath.Join(UploadDir, fmt.Sprintf("%d", now.Year()), fmt.Sprintf("%02d", now.Month()), fmt.Sprintf("%02d", now.Day()))
	if err := os.MkdirAll(subDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(subDir, id), nil
}

func StartCleanupTask() {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			CleanupOldFiles()
		}
	}()
}

func CleanupOldFiles() {
	filepath.Walk(UploadDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			if filepath.Ext(path) == ".tmp" && time.Since(info.ModTime()) > 1*time.Hour {
				os.Remove(path)
				fmt.Printf("Cleaned up orphaned file: %s\n", path)
			}
		}
		return nil
	})
}
