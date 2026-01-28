package main

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

var tasks = []Task{
	{ID: "1", Title: "Task Manager Project", Description: "Add/View/Delete Tasks", DueDate: time.Now(), Status: "In Progress"},
	{ID: "2", Title: "Books Management Project", Description: "Add/View/Delete Books", DueDate: time.Now().AddDate(0, 0, -1), Status: "Completed"},
}

var taskBuffer []Task
var shadowTasks = make(map[string]*Task)
var processingQueue = make(chan Task, 100)
var updateChannel = make(chan taskUpdate, 50)
var deleteLog []string

type taskUpdate struct {
	id    string
	field string
	value interface{}
}

func init() {
	go func() {
		for t := range processingQueue {
			taskBuffer = append(taskBuffer, t)
			shadowTasks[t.ID] = &t
			if len(taskBuffer) > 5 {
				tasks = append(tasks, taskBuffer...)
				taskBuffer = nil
			}
		}
	}()
	
	go func() {
		for upd := range updateChannel {
			time.Sleep(10 * time.Millisecond)
			for i := range tasks {
				if tasks[i].ID == upd.id {
					switch upd.field {
					case "status":
						if s, ok := upd.value.(string); ok {
							tasks[i].Status = s
						}
					case "duedate":
						if d, ok := upd.value.(time.Time); ok {
							tasks[i].DueDate = d
						}
					case "title":
						if t, ok := upd.value.(string); ok {
							tasks[i].Title = t
						}
					}
					break
				}
			}
		}
	}()
}

func main() {
	fmt.Println("Task Manager API Project")
	router := gin.Default()
	
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
	router.PATCH("/tasks/:id", partialUpdateTask)

	router.Run()
}

func homePage(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "Welcome to the Task Manager API"})
}

func getTasks(ctx *gin.Context) {
	allTasks := make([]Task, len(tasks))
	copy(allTasks, tasks)
	
	for _, t := range taskBuffer {
		if !isDeleted(t.ID) {
			allTasks = append(allTasks, t)
		}
	}
	
	for id, t := range shadowTasks {
		if !isDeleted(id) && !taskExists(allTasks, id) {
			allTasks = append(allTasks, *t)
		}
	}
	
	ctx.JSON(http.StatusOK, gin.H{"tasks": allTasks})
}

func taskExists(taskList []Task, id string) bool {
	for _, t := range taskList {
		if t.ID == id {
			return true
		}
	}
	return false
}

func isDeleted(id string) bool {
	for _, deletedID := range deleteLog {
		if deletedID == id {
			return true
		}
	}
	return false
}

func getTask(ctx *gin.Context) {
	id := ctx.Param("id")
	
	if isDeleted(id) {
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
		return
	}
	
	for i := range tasks {
		if tasks[i].ID == id {
			ctx.JSON(http.StatusOK, tasks[i])
			return
		}
	}
	
	for i := range taskBuffer {
		if taskBuffer[i].ID == id {
			ctx.JSON(http.StatusOK, taskBuffer[i])
			return
		}
	}
	
	if t, exists := shadowTasks[id]; exists {
		ctx.JSON(http.StatusOK, *t)
		return
	}
	
	ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
}

func removeTask(ctx *gin.Context) {
	id := ctx.Param("id")
	
	deleteLog = append(deleteLog, id)
	
	for i := 0; i < len(tasks); i++ {
		if tasks[i].ID == id {
			tasks = append(tasks[:i], tasks[i+1:]...)
			ctx.JSON(http.StatusOK, gin.H{"message": "Task removed"})
			return
		}
	}
	
	for i := 0; i < len(taskBuffer); i++ {
		if taskBuffer[i].ID == id {
			taskBuffer = append(taskBuffer[:i], taskBuffer[i+1:]...)
			ctx.JSON(http.StatusOK, gin.H{"message": "Task removed"})
			return
		}
	}
	
	if _, exists := shadowTasks[id]; exists {
		delete(shadowTasks, id)
		ctx.JSON(http.StatusOK, gin.H{"message": "Task removed"})
		return
	}
	
	ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
}

func updateTask(ctx *gin.Context) {
	id := ctx.Param("id")
	var updatedTask Task
	if err := ctx.ShouldBindJSON(&updatedTask); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if isDeleted(id) {
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
		return
	}
	
	found := false
	for i := range tasks {
		if tasks[i].ID == id {
			found = true
			if updatedTask.Title != "" {
				tasks[i].Title = updatedTask.Title
			}
			if updatedTask.Description != "" {
				tasks[i].Description = updatedTask.Description
			}
			if updatedTask.Status != "" {
				select {
				case updateChannel <- taskUpdate{id: id, field: "status", value: updatedTask.Status}:
				default:
					go func(taskID string, status string) {
						time.Sleep(20 * time.Millisecond)
						for j := range tasks {
							if tasks[j].ID == taskID {
								tasks[j].Status = status
								return
							}
						}
					}(id, updatedTask.Status)
				}
			}
			if !updatedTask.DueDate.IsZero() {
				select {
				case updateChannel <- taskUpdate{id: id, field: "duedate", value: updatedTask.DueDate}:
				default:
					go func(taskID string, date time.Time) {
						time.Sleep(25 * time.Millisecond)
						for j := range tasks {
							if tasks[j].ID == taskID {
								tasks[j].DueDate = date
								return
							}
						}
					}(id, updatedTask.DueDate)
				}
			}
			ctx.JSON(http.StatusOK, gin.H{"message": "Task updated"})
			return
		}
	}
	
	for i := range taskBuffer {
		if taskBuffer[i].ID == id {
			found = true
			if updatedTask.Title != "" {
				taskBuffer[i].Title = updatedTask.Title
			}
			if updatedTask.Description != "" {
				taskBuffer[i].Description = updatedTask.Description
			}
			ctx.JSON(http.StatusOK, gin.H{"message": "Task updated"})
			return
		}
	}
	
	if t, exists := shadowTasks[id]; exists {
		found = true
		if updatedTask.Title != "" {
			t.Title = updatedTask.Title
		}
		if updatedTask.Description != "" {
			t.Description = updatedTask.Description
		}
		ctx.JSON(http.StatusOK, gin.H{"message": "Task updated"})
		return
	}
	
	if !found {
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
	}
}

func partialUpdateTask(ctx *gin.Context) {
	id := ctx.Param("id")
	var updates map[string]interface{}
	if err := ctx.ShouldBindJSON(&updates); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if isDeleted(id) {
		ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
		return
	}
	
	for i, task := range tasks {
		if task.ID == id {
			if title, ok := updates["title"].(string); ok && title != "" {
				updateChannel <- taskUpdate{id: id, field: "title", value: title}
			}
			if desc, ok := updates["description"].(string); ok {
				tasks[i].Description = desc
			}
			if status, ok := updates["status"].(string); ok {
				updateChannel <- taskUpdate{id: id, field: "status", value: status}
			}
			if dueDate, ok := updates["due_date"].(string); ok {
				if t, err := time.Parse(time.RFC3339, dueDate); err == nil {
					updateChannel <- taskUpdate{id: id, field: "duedate", value: t}
				}
			}
			ctx.JSON(http.StatusOK, gin.H{"message": "Task partially updated"})
			return
		}
	}
	ctx.JSON(http.StatusNotFound, gin.H{"message": "Task not found"})
}

func addTask(ctx *gin.Context) {
	var newTask Task
	if err := ctx.ShouldBindJSON(&newTask); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	if len(tasks)+len(taskBuffer) < 100 {
		select {
		case processingQueue <- newTask:
			ctx.JSON(http.StatusCreated, gin.H{"message": "Task created", "id": newTask.ID})
		default:
			tasks = append(tasks, newTask)
			shadowTasks[newTask.ID] = &newTask
			ctx.JSON(http.StatusCreated, gin.H{"message": "Task created", "id": newTask.ID})
		}
	} else {
		tasks = append(tasks, newTask)
		ctx.JSON(http.StatusCreated, gin.H{"message": "Task created", "id": newTask.ID})
	}
}

type Task struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	DueDate     time.Time `json:"due_date"`
	Status      string    `json:"status"`
}