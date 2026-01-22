package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"

	"dblock-demo/dblock"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://user:password@localhost:5432/postgres?sslmode=disable"
	}
	db, err := openDBWithRetry(dsn, 30*time.Second)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	lock := dblock.NewDatabaseLockHelper(db, "example-lock")

	fmt.Println("Acquiring lock...")
	if err := lock.AcquireLock(ctx, 3); err != nil {
		fmt.Println("Failed:", err)
		return
	}

	fmt.Println("Lock acquired, holding for 2 seconds...")
	time.Sleep(2 * time.Second)

	lock.ReleaseLock()
	fmt.Println("Lock released")
}

func openDBWithRetry(dsn string, timeout time.Duration) (*sql.DB, error) {
	deadline := time.Now().Add(timeout)
	var lastErr error
	for {
		db, err := sql.Open("postgres", dsn)
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			err = db.PingContext(ctx)
			cancel()
			if err == nil {
				return db, nil
			}
			db.Close()
		}
		lastErr = err
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("timed out waiting for database: %w", lastErr)
		}
		time.Sleep(1 * time.Second)
	}
}
