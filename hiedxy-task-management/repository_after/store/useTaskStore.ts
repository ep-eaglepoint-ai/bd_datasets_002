import { create } from "zustand";
import { Task, TaskSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  loadTasks: () => Promise<void>;
  addTask: (
    task: Omit<Task, "id" | "createdAt" | "updatedAt" | "status">,
  ) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real app we might want pagination or filters here,
      // but for offline-first with IDB, loading all (virtualized list) is okay for thousands.
      const tasks = await db.getTasks();
      // Sort by createdAt desc by default or whatever
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
      id: crypto.randomUUID(), // Native UUID if available, else use uuid lib or polyfill.
      // Next.js client side has crypto.randomUUID
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: taskInput.tags || [],
    };

    // Validate
    const result = TaskSchema.safeParse(newTask);
    if (!result.success) {
      set({ error: result.error.message });
      return;
    }

    try {
      await db.putTask(newTask);
      set((state) => ({ tasks: [newTask, ...state.tasks] }));
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
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteTask: async (id) => {
    try {
      await db.deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
