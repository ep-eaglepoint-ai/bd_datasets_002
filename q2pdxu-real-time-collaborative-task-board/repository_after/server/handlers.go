package main

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type Server struct {
	db  *sql.DB
	hub *Hub
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	hash, _ := hashPassword(req.Password)
	var userID int
	err := s.db.QueryRow("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
		req.Email, hash).Scan(&userID)

	if err != nil {
		http.Error(w, "Registration failed", http.StatusBadRequest)
		return
	}

	token, _ := generateToken(userID, req.Email)
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var user User
	err := s.db.QueryRow("SELECT id, email, password FROM users WHERE email = $1", req.Email).
		Scan(&user.ID, &user.Email, &user.Password)

	if err != nil || !checkPassword(req.Password, user.Password) {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	token, _ := generateToken(user.ID, user.Email)
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func (s *Server) getBoards(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int)

	rows, _ := s.db.Query(`
		SELECT DISTINCT b.id, b.name, b.owner_id, b.created_at 
		FROM boards b 
		LEFT JOIN board_members bm ON b.id = bm.board_id 
		WHERE b.owner_id = $1 OR bm.user_id = $1
		ORDER BY b.created_at DESC`, userID)
	defer rows.Close()

	boards := []Board{}
	for rows.Next() {
		var b Board
		rows.Scan(&b.ID, &b.Name, &b.OwnerID, &b.CreatedAt)
		boards = append(boards, b)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"boards": boards})
}

func (s *Server) createBoard(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(int)
	var req struct {
		Name string `json:"name"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var boardID int
	err := s.db.QueryRow("INSERT INTO boards (name, owner_id) VALUES ($1, $2) RETURNING id",
		req.Name, userID).Scan(&boardID)

	if err != nil {
		http.Error(w, "Failed to create board", http.StatusInternalServerError)
		return
	}

	columns := []string{"To Do", "In Progress", "Done"}
	for i, name := range columns {
		s.db.Exec("INSERT INTO columns (board_id, name, position) VALUES ($1, $2, $3)",
			boardID, name, i)
	}

	json.NewEncoder(w).Encode(map[string]int{"id": boardID})
}

func (s *Server) getBoard(w http.ResponseWriter, r *http.Request) {
	boardID, _ := strconv.Atoi(mux.Vars(r)["id"])

	columns := []Column{}
	rows, _ := s.db.Query("SELECT id, board_id, name, position FROM columns WHERE board_id = $1 ORDER BY position", boardID)
	for rows.Next() {
		var c Column
		rows.Scan(&c.ID, &c.BoardID, &c.Name, &c.Position)
		columns = append(columns, c)
	}
	rows.Close()

	tasks := []Task{}
	rows, _ = s.db.Query("SELECT id, column_id, title, description, position FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE board_id = $1) ORDER BY position", boardID)
	for rows.Next() {
		var t Task
		rows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Position)
		tasks = append(tasks, t)
	}
	rows.Close()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"columns": columns,
		"tasks":   tasks,
	})
}

func (s *Server) createTask(w http.ResponseWriter, r *http.Request) {
	boardID, _ := strconv.Atoi(mux.Vars(r)["id"])
	var req struct {
		ColumnID    int    `json:"column_id"`
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var position int
	s.db.QueryRow("SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE column_id = $1", req.ColumnID).Scan(&position)

	var task Task
	err := s.db.QueryRow("INSERT INTO tasks (column_id, title, description, position) VALUES ($1, $2, $3, $4) RETURNING id, column_id, title, description, position",
		req.ColumnID, req.Title, req.Description, position).Scan(&task.ID, &task.ColumnID, &task.Title, &task.Description, &task.Position)

	if err != nil {
		http.Error(w, "Failed to create task", http.StatusInternalServerError)
		return
	}

	s.hub.broadcastToBoard(boardID, WSMessage{Type: "task_created", Data: task})
	json.NewEncoder(w).Encode(task)
}

func (s *Server) updateTask(w http.ResponseWriter, r *http.Request) {
	taskID, _ := strconv.Atoi(mux.Vars(r)["id"])
	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var task Task
	err := s.db.QueryRow("UPDATE tasks SET title = $1, description = $2 WHERE id = $3 RETURNING id, column_id, title, description, position",
		req.Title, req.Description, taskID).Scan(&task.ID, &task.ColumnID, &task.Title, &task.Description, &task.Position)

	if err != nil {
		http.Error(w, "Failed to update task", http.StatusInternalServerError)
		return
	}

	var boardID int
	s.db.QueryRow("SELECT board_id FROM columns WHERE id = $1", task.ColumnID).Scan(&boardID)
	s.hub.broadcastToBoard(boardID, WSMessage{Type: "task_updated", Data: task})

	json.NewEncoder(w).Encode(task)
}

func (s *Server) deleteTask(w http.ResponseWriter, r *http.Request) {
	taskID, _ := strconv.Atoi(mux.Vars(r)["id"])

	var columnID int
	s.db.QueryRow("SELECT column_id FROM tasks WHERE id = $1", taskID).Scan(&columnID)

	s.db.Exec("DELETE FROM tasks WHERE id = $1", taskID)

	var boardID int
	s.db.QueryRow("SELECT board_id FROM columns WHERE id = $1", columnID).Scan(&boardID)
	s.hub.broadcastToBoard(boardID, WSMessage{Type: "task_deleted", Data: map[string]int{"id": taskID}})

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) moveTask(w http.ResponseWriter, r *http.Request) {
	taskID, _ := strconv.Atoi(mux.Vars(r)["id"])
	var req struct {
		ColumnID int `json:"column_id"`
		Position int `json:"position"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	var task Task
	err := s.db.QueryRow("UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3 RETURNING id, column_id, title, description, position",
		req.ColumnID, req.Position, taskID).Scan(&task.ID, &task.ColumnID, &task.Title, &task.Description, &task.Position)

	if err != nil {
		http.Error(w, "Failed to move task", http.StatusInternalServerError)
		return
	}

	var boardID int
	s.db.QueryRow("SELECT board_id FROM columns WHERE id = $1", task.ColumnID).Scan(&boardID)
	s.hub.broadcastToBoard(boardID, WSMessage{Type: "task_moved", Data: task})

	json.NewEncoder(w).Encode(task)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	boardID, _ := strconv.Atoi(mux.Vars(r)["id"])
	token := r.URL.Query().Get("token")

	userID, email, err := validateToken(token)
	if err != nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		conn:    conn,
		boardID: boardID,
		userID:  userID,
		email:   email,
		hub:     s.hub,
	}

	s.hub.register <- client

	columns := []Column{}
	rows, _ := s.db.Query("SELECT id, board_id, name, position FROM columns WHERE board_id = $1 ORDER BY position", boardID)
	for rows.Next() {
		var c Column
		rows.Scan(&c.ID, &c.BoardID, &c.Name, &c.Position)
		columns = append(columns, c)
	}
	rows.Close()

	tasks := []Task{}
	rows, _ = s.db.Query("SELECT id, column_id, title, description, position FROM tasks WHERE column_id IN (SELECT id FROM columns WHERE board_id = $1) ORDER BY position", boardID)
	for rows.Next() {
		var t Task
		rows.Scan(&t.ID, &t.ColumnID, &t.Title, &t.Description, &t.Position)
		tasks = append(tasks, t)
	}
	rows.Close()

	stateMsg := WSMessage{
		Type: "board_state",
		Data: map[string]interface{}{
			"columns": columns,
			"tasks":   tasks,
		},
	}
	data, _ := json.Marshal(stateMsg)
	conn.WriteMessage(websocket.TextMessage, data)

	go func() {
		defer func() {
			s.hub.unregister <- client
		}()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}()
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		userID, _, err := validateToken(token)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		w.Header().Set("X-User-ID", strconv.Itoa(userID))
		next(w, r)
	}
}
