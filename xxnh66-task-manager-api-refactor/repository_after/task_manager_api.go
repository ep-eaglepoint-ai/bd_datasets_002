package main

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Task represents a task in the task manager
type Task struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DueDate     time.Time `json:"due_date"`
	Status      string    `json:"status"`
}

// Thread-safe task storage - single source of truth
var (
	tasks   = make(map[string]Task)
	tasksMu sync.RWMutex
)

// Valid status values
var validStatuses = map[string]bool{
	"Pending":     true,
	"In Progress": true,
	"Completed":   true,
}

// Date validation bounds
var (
	minDate = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
)

func maxDate() time.Time {
	return time.Now().AddDate(10, 0, 0)
}

// Initialize with default tasks
func init() {
	tasks["1"] = Task{
		ID:          "1",
		Title:       "Task Manager Project",
		Description: "Add/View/Delete Tasks",
		DueDate:     time.Now(),
		Status:      "In Progress",
	}
	tasks["2"] = Task{
		ID:          "2",
		Title:       "Books Management Project",
		Description: "Add/View/Delete Books",
		DueDate:     time.Now().AddDate(0, 0, -1),
		Status:      "Completed",
	}
}

func main() {
	fmt.Println("Task Manager API Project")
	router := gin.Default()

	// CORS middleware (unchanged)
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	router.GET("/", homePage)
	router.GET("/tasks", getTasks)
	router.GET("/tasks/:id", getTask)
	router.DELETE("/tasks/:id", removeTask)
	router.POST("/tasks", addTask)
	router.PUT("/tasks/:id", updateTask)

	router.Run()
}

func homePage(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Welcome to the Task Manager API"})
}

// getTasks returns all tasks - thread-safe read
func getTasks(ctx *gin.Context) {
	tasksMu.RLock()
	result := make([]Task, 0, len(tasks))
	for _, task := range tasks {
		result = append(result, task)
	}
	tasksMu.RUnlock()

	ctx.JSON(http.StatusOK, gin.H{"tasks": result})
}

// getTask returns a single task by ID - thread-safe read
func getTask(ctx *gin.Context) {
	id := ctx.Param("id")

	tasksMu.RLock()
	task, exists := tasks[id]
	tasksMu.RUnlock()

	if !exists {
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
		return
	}

	ctx.JSON(http.StatusOK, task)
}

// removeTask deletes a task by ID - thread-safe write
func removeTask(ctx *gin.Context) {
	id := ctx.Param("id")

	tasksMu.Lock()
	_, exists := tasks[id]
	if !exists {
		tasksMu.Unlock()
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
		return
	}
	delete(tasks, id)
	tasksMu.Unlock()

	ctx.JSON(http.StatusOK, gin.H{"message": "Task removed"})
}

// validateTask validates all task fields and returns an error message if invalid
func validateTask(task Task, isCreate bool) string {
	// Validate ID (required for creation)
	if isCreate && task.ID == "" {
		return "id is required"
	}

	// Validate Title (required, non-empty)
	if task.Title == "" {
		return "title cannot be empty"
	}

	// Validate Description (required, non-empty)
	if task.Description == "" {
		return "description cannot be empty"
	}

	// Validate Status (must be one of valid values)
	if !validStatuses[task.Status] {
		return "status must be one of: Pending, In Progress, Completed"
	}

	// Validate DueDate (must be between Jan 1, 2000 and 10 years from now)
	if task.DueDate.Before(minDate) || task.DueDate.After(maxDate()) {
		return fmt.Sprintf("due_date must be between %s and %s",
			minDate.Format("2006-01-02"),
			maxDate().Format("2006-01-02"))
	}

	return ""
}

// addTask creates a new task - thread-safe write with validation
func addTask(ctx *gin.Context) {
	var newTask Task
	if err := ctx.ShouldBindJSON(&newTask); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate task fields
	if errMsg := validateTask(newTask, true); errMsg != "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	tasksMu.Lock()
	// Check for duplicate ID
	if _, exists := tasks[newTask.ID]; exists {
		tasksMu.Unlock()
		ctx.JSON(http.StatusConflict, gin.H{"error": "task with this id already exists"})
		return
	}
	tasks[newTask.ID] = newTask
	tasksMu.Unlock()

	// Return the full task object as required by API contract
	ctx.JSON(http.StatusCreated, newTask)
}

// updateTask performs a full update of a task - thread-safe write with validation
func updateTask(ctx *gin.Context) {
	id := ctx.Param("id")
	var updatedTask Task
	if err := ctx.ShouldBindJSON(&updatedTask); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tasksMu.Lock()
	existingTask, exists := tasks[id]
	if !exists {
		tasksMu.Unlock()
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
		return
	}

	// Apply partial updates - preserve fields that are not provided
	if updatedTask.Title != "" {
		existingTask.Title = updatedTask.Title
	}
	if updatedTask.Description != "" {
		existingTask.Description = updatedTask.Description
	}
	if updatedTask.Status != "" {
		// Validate status before applying
		if !validStatuses[updatedTask.Status] {
			tasksMu.Unlock()
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "status must be one of: Pending, In Progress, Completed"})
			return
		}
		existingTask.Status = updatedTask.Status
	}
	if !updatedTask.DueDate.IsZero() {
		// Validate due date before applying
		if updatedTask.DueDate.Before(minDate) || updatedTask.DueDate.After(maxDate()) {
			tasksMu.Unlock()
			ctx.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("due_date must be between %s and %s",
				minDate.Format("2006-01-02"),
				maxDate().Format("2006-01-02"))})
			return
		}
		existingTask.DueDate = updatedTask.DueDate
	}

	// Ensure the ID remains unchanged
	existingTask.ID = id
	tasks[id] = existingTask
	tasksMu.Unlock()

	// Return the full updated task object as required by API contract
	ctx.JSON(http.StatusOK, existingTask)
}
