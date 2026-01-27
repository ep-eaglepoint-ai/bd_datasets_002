package main

import "time"

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type Board struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	OwnerID   int       `json:"owner_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Column struct {
	ID       int    `json:"id"`
	BoardID  int    `json:"board_id"`
	Name     string `json:"name"`
	Position int    `json:"position"`
}

type Task struct {
	ID          int    `json:"id"`
	ColumnID    int    `json:"column_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Position    int    `json:"position"`
}

type WSMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}
