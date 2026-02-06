package main

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	conn    *websocket.Conn
	boardID int
	userID  int
	email   string
	hub     *Hub
}

type Hub struct {
	clients    map[int]map[*Client]bool
	broadcast  chan WSMessage
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[int]map[*Client]bool),
		broadcast:  make(chan WSMessage, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if h.clients[client.boardID] == nil {
				h.clients[client.boardID] = make(map[*Client]bool)
			}
			h.clients[client.boardID][client] = true
			h.mu.Unlock()

			h.broadcastToBoard(client.boardID, WSMessage{
				Type: "user_joined",
				Data: map[string]interface{}{"email": client.email},
			})

		case client := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.clients[client.boardID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					client.conn.Close()
					if len(clients) == 0 {
						delete(h.clients, client.boardID)
					}
				}
			}
			h.mu.Unlock()

			h.broadcastToBoard(client.boardID, WSMessage{
				Type: "user_left",
				Data: map[string]interface{}{"email": client.email},
			})

		case message := <-h.broadcast:
			if boardID, ok := message.Data.(map[string]interface{})["board_id"].(int); ok {
				h.broadcastToBoard(boardID, message)
			}
		}
	}
}

func (h *Hub) broadcastToBoard(boardID int, message WSMessage) {
	h.mu.RLock()
	clients := h.clients[boardID]
	h.mu.RUnlock()

	data, _ := json.Marshal(message)
	for client := range clients {
		if err := client.conn.WriteMessage(websocket.TextMessage, data); err != nil {
			h.unregister <- client
		}
	}
}
