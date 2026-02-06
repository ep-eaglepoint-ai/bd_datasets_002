package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func initDB() *sql.DB {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}

	createTables(db)
	return db
}

func createTables(db *sql.DB) {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id SERIAL PRIMARY KEY,
		email VARCHAR(255) UNIQUE NOT NULL,
		password VARCHAR(255) NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS boards (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		owner_id INTEGER REFERENCES users(id),
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS columns (
		id SERIAL PRIMARY KEY,
		board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
		name VARCHAR(255) NOT NULL,
		position INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS tasks (
		id SERIAL PRIMARY KEY,
		column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
		title VARCHAR(255) NOT NULL,
		description TEXT,
		position INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS board_members (
		board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
		user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
		PRIMARY KEY (board_id, user_id)
	);
	`

	if _, err := db.Exec(schema); err != nil {
		log.Fatal(err)
	}
}
