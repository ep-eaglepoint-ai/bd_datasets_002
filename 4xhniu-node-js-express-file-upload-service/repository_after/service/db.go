package service

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var db *sql.DB

func InitDB(filepath string) error {
	var err error
	db, err = sql.Open("sqlite3", filepath)
	if err != nil {
		return err
	}

	// Req 7: Connection Pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	query := `
	CREATE TABLE IF NOT EXISTS uploads (
		id TEXT PRIMARY KEY,
		filename TEXT,
		size INTEGER,
		checksum TEXT,
		path TEXT,
		uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = db.Exec(query)
	return err
}

func CloseDB() {
	if db != nil {
		db.Close()
	}
}

func SaveMetadataAsync(id, filename string, size int64, checksum, path string) {
	go func() {
		if db == nil {
			return
		}
		query := `INSERT INTO uploads (id, filename, size, checksum, path) VALUES (?, ?, ?, ?, ?)`
		_, err := db.Exec(query, id, filename, size, checksum, path)
		if err != nil {
			log.Printf("Failed to save metadata for %s: %v", id, err)
		}
	}()
}
