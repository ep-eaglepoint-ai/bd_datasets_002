import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { api } from "../services/api";
import { useWebSocket } from "../hooks/useWebSocket";
import type { Column, Task, WSMessage } from "../types";
import { TaskCard } from "./TaskCard";
import { ColumnView } from "./ColumnView";

interface BoardProps {
  boardId: number;
  onBack: () => void;
}

export const Board = ({ boardId, onBack }: BoardProps) => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setColumns(data.columns || []);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to load board");
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleWSMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case "board_state":
        setColumns(msg.data.columns || []);
        setTasks(msg.data.tasks || []);
        break;
      case "task_created":
        setTasks((prev) => [...prev, msg.data]);
        break;
      case "task_updated":
        setTasks((prev) =>
          prev.map((t) => (t.id === msg.data.id ? msg.data : t)),
        );
        break;
      case "task_moved":
        setTasks((prev) =>
          prev.map((t) => (t.id === msg.data.id ? msg.data : t)),
        );
        break;
      case "task_deleted":
        setTasks((prev) => prev.filter((t) => t.id !== msg.data.id));
        break;
      case "user_joined":
        setActiveUsers((prev) => [...prev, msg.data.email]);
        break;
      case "user_left":
        setActiveUsers((prev) => prev.filter((u) => u !== msg.data.email));
        break;
    }
  }, []);

  useWebSocket(boardId, handleWSMessage);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedColumn) return;
    try {
      await api.createTask(boardId, selectedColumn, newTaskTitle, "");
      setNewTaskTitle("");
      setSelectedColumn(null);
    } catch (err) {
      console.error("Failed to create task");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await api.deleteTask(taskId);
    } catch (err) {
      console.error("Failed to delete task");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = Number(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column: either dropped on a column or on a task within a column
    let overColumnId: number;
    const overId = over.id.toString();

    if (overId.startsWith("column-")) {
      // Dropped on a column directly
      overColumnId = Number(overId.split("-")[1]);
    } else {
      // Dropped on a task - find which column that task belongs to
      const overTask = tasks.find((t) => t.id === Number(overId));
      if (!overTask) return;
      overColumnId = overTask.column_id;
    }

    const tasksInColumn = tasks.filter((t) => t.column_id === overColumnId);
    const newPosition = tasksInColumn.length;

    if (task.column_id !== overColumnId || task.position !== newPosition) {
      try {
        await api.moveTask(taskId, overColumnId, newPosition);
      } catch (err) {
        console.error("Failed to move task");
      }
    }
  };

  return (
    <div>
      <div className="app-header" style={{ marginBottom: "32px" }}>
        <button onClick={onBack}>← Back</button>
        <div className="active-users">
          Users: {activeUsers.join(", ") || "Just you"}
        </div>
      </div>

      <form onSubmit={handleCreateTask} className="input-group">
        <select
          value={selectedColumn || ""}
          onChange={(e) => setSelectedColumn(Number(e.target.value))}
        >
          <option value="">Select column...</option>
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Task title"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <button type="submit">Add Task</button>
      </form>

      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
        <div className="column-container">
          {columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              tasks={tasks.filter((t) => t.column_id === column.id)}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
