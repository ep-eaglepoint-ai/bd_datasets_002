import { create } from "zustand";
import { Task, TaskSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface HistoryAction {
  type: "add" | "update" | "delete";
  taskId: string;
  previousData?: Task;
  newData?: Task;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  history: HistoryAction[];
  future: HistoryAction[];

  loadTasks: () => Promise<void>;
  addTask: (
    task: Omit<Task, "id" | "createdAt" | "updatedAt" | "status">,
  ) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  history: [],
  future: [],

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await db.getTasks();
      set({
        tasks: tasks.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addTask: async (taskInput) => {
    const newTask: Task = {
      ...taskInput,
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: taskInput.tags || [],
    };

    const result = TaskSchema.safeParse(newTask);
    if (!result.success) {
      set({ error: result.error.message });
      return;
    }

    try {
      await db.putTask(newTask);
      set((state) => ({
        tasks: [newTask, ...state.tasks],
        history: [
          ...state.history,
          { type: "add", taskId: newTask.id, newData: newTask },
        ],
        future: [],
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateTask: async (id, updates) => {
    const currentTask = get().tasks.find((t) => t.id === id);
    if (!currentTask) return;

    const updatedTask = {
      ...currentTask,
      ...updates,
      updatedAt: new Date(),
    };

    const result = TaskSchema.safeParse(updatedTask);
    if (!result.success) {
      set({ error: result.error.message });
      return;
    }

    try {
      await db.putTask(updatedTask);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
        history: [
          ...state.history,
          {
            type: "update",
            taskId: id,
            previousData: currentTask,
            newData: updatedTask,
          },
        ],
        future: [],
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteTask: async (id) => {
    const currentTask = get().tasks.find((t) => t.id === id);
    if (!currentTask) return;

    try {
      await db.deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        history: [
          ...state.history,
          { type: "delete", taskId: id, previousData: currentTask },
        ],
        future: [],
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  undo: async () => {
    const { history, future, tasks } = get();
    if (history.length === 0) return;

    const action = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newFuture = [action, ...future];

    try {
      if (action.type === "add") {
        await db.deleteTask(action.taskId);
        set({
          tasks: tasks.filter((t) => t.id !== action.taskId),
          history: newHistory,
          future: newFuture,
        });
      } else if (action.type === "update") {
        if (action.previousData) {
          await db.putTask(action.previousData);
          set({
            tasks: tasks.map((t) =>
              t.id === action.taskId ? action.previousData! : t,
            ),
            history: newHistory,
            future: newFuture,
          });
        }
      } else if (action.type === "delete") {
        if (action.previousData) {
          await db.putTask(action.previousData);
          set({
            tasks: [...tasks, action.previousData],
            history: newHistory,
            future: newFuture,
          });
        }
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  redo: async () => {
    const { history, future, tasks } = get();
    if (future.length === 0) return;

    const action = future[0];
    const newFuture = future.slice(1);
    const newHistory = [...history, action];

    try {
      if (action.type === "add") {
        if (action.newData) {
          await db.putTask(action.newData);
          set({
            tasks: [action.newData, ...tasks],
            history: newHistory,
            future: newFuture,
          });
        }
      } else if (action.type === "update") {
        if (action.newData) {
          await db.putTask(action.newData);
          set({
            tasks: tasks.map((t) =>
              t.id === action.taskId ? action.newData! : t,
            ),
            history: newHistory,
            future: newFuture,
          });
        }
      } else if (action.type === "delete") {
        await db.deleteTask(action.taskId);
        set({
          tasks: tasks.filter((t) => t.id !== action.taskId),
          history: newHistory,
          future: newFuture,
        });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
