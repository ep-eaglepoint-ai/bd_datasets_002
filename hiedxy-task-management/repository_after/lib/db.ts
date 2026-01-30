import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Task, TimeLog } from "./schemas";

interface TaskDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { "by-status": string; "by-priority": string; "by-dueDate": Date };
  };
  timeLogs: {
    key: string;
    value: TimeLog;
    indexes: { "by-taskId": string; "by-startTime": Date };
  };
}

const DB_NAME = "task-manager-db";
const DB_VERSION = 1;

export class Database {
  private dbPromise: Promise<IDBPDatabase<TaskDB>>;

  constructor() {
    // Only run on client
    if (typeof window !== "undefined") {
      this.dbPromise = openDB<TaskDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
          taskStore.createIndex("by-status", "status");
          taskStore.createIndex("by-priority", "priority");
          taskStore.createIndex("by-dueDate", "dueDate");

          const logStore = db.createObjectStore("timeLogs", { keyPath: "id" });
          logStore.createIndex("by-taskId", "taskId");
          logStore.createIndex("by-startTime", "startTime");
        },
      });
    } else {
      this.dbPromise = new Promise(() => {}); // Never resolves on server
    }
  }

  async getTasks(): Promise<Task[]> {
    if (typeof window === "undefined") return [];
    const db = await this.dbPromise;
    return db.getAll("tasks");
  }

  async getTask(id: string): Promise<Task | undefined> {
    if (typeof window === "undefined") return undefined;
    const db = await this.dbPromise;
    return db.get("tasks", id);
  }

  async putTask(task: Task): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await this.dbPromise;
    await db.put("tasks", task);
  }

  async deleteTask(id: string): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await this.dbPromise;
    await db.delete("tasks", id);
  }

  async getTimeLogs(taskId?: string): Promise<TimeLog[]> {
    if (typeof window === "undefined") return [];
    const db = await this.dbPromise;
    if (taskId) {
      return db.getAllFromIndex("timeLogs", "by-taskId", taskId);
    }
    return db.getAll("timeLogs");
  }

  async putTimeLog(log: TimeLog): Promise<void> {
    if (typeof window === "undefined") return;
    const db = await this.dbPromise;
    await db.put("timeLogs", log);
  }
}

export const db = new Database();
