import { create } from "zustand";
import { TimeLog, TimeLogSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { useTaskStore } from "./useTaskStore";

interface TimeState {
  activeTaskId: string | null;
  startTime: Date | null;
  isTracking: boolean;
  logs: TimeLog[];

  startTimer: (taskId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  loadLogs: (taskId?: string) => Promise<void>;
}

export const useTimeStore = create<TimeState>((set, get) => ({
  activeTaskId: null,
  startTime: null,
  isTracking: false,
  logs: [],

  // In a real app, we persist active timer in localStorage to survive refresh.
  // We'll initialize from localStorage if available. (To be implemented in useEffect in a component or middleware)

  startTimer: async (taskId) => {
    const { activeTaskId, stopTimer } = get();
    if (activeTaskId) {
      await stopTimer(); // Auto-stop current if exists
    }

    set({ activeTaskId: taskId, startTime: new Date(), isTracking: true });
    // Persist active state (TODO: Implement persistence helper)
    localStorage.setItem(
      "activeTimer",
      JSON.stringify({ taskId, startTime: new Date().toISOString() }),
    );
  },

  stopTimer: async () => {
    const { activeTaskId, startTime } = get();
    if (!activeTaskId || !startTime) return;

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

    const newLog: TimeLog = {
      id: crypto.randomUUID(),
      taskId: activeTaskId,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      notes: "",
    };

    // Validate
    if (!TimeLogSchema.safeParse(newLog).success) {
      console.error("Invalid log");
      return;
    }

    await db.putTimeLog(newLog);

    // Update active task status if needed? Maybe not.

    set((state) => ({
      activeTaskId: null,
      startTime: null,
      isTracking: false,
      logs: [newLog, ...state.logs],
    }));

    localStorage.removeItem("activeTimer");
  },

  loadLogs: async (taskId) => {
    const logs = await db.getTimeLogs(taskId);
    set({ logs });
  },
}));
