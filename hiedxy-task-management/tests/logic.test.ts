import { TaskSchema, TimeLogSchema } from "../repository_after/lib/schemas";
import { useTaskStore } from "../repository_after/store/useTaskStore";
import { useTimeStore } from "../repository_after/store/useTimeStore";
import { db } from "../repository_after/lib/db";

// Mock DB is handled by fake-indexeddb via jest.setup.ts in repository_after

describe("Task Management Logic", () => {
  beforeEach(async () => {
    // Reset store
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });

    // Clear DB
    // We need to access the db instance. Since it's a singleton wrapping a promise,
    // we assume the environment (JSDOM + fake-indexeddb) behaves correctly.
    // However, `idb` library might hold connection.

    // For now, let's rely on the store's loadTasks to see empty state if we clear it.
    // Or we can try to clear assuming global indexedDB Mock is active.

    const req = indexedDB.open("task-manager-db");
    req.onsuccess = (e: any) => {
      const db = e.target.result;
      // This is low level, but idb wrapper makes it hard to clear synchronously without exposing method.
      // Let's rely on fresh state for now or add clear method to db class if needed.
    };
  });

  test("Validates Task Schema correctly", () => {
    const validTask = {
      id: crypto.randomUUID(),
      title: "Test Task",
      status: "pending",
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(validTask).success).toBe(true);

    const invalidTask = {
      id: "not-uuid",
      title: "", // Empty title
    };
    expect(TaskSchema.safeParse(invalidTask).success).toBe(false);
  });

  test("Store adds task to DB and updates state", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({
      title: "New Task",
      priority: "high",
      estimatedDuration: 60,
    });

    const state = useTaskStore.getState();
    if (state.error) console.error("Store Error:", state.error);
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe("New Task");
    expect(state.tasks[0].priority).toBe("high");

    // Check DB persistence (via store load)
    // We simulate a fresh load
    useTaskStore.setState({ tasks: [] });
    await useTaskStore.getState().loadTasks();
    const reloadedState = useTaskStore.getState();
    expect(reloadedState.tasks).toHaveLength(1);
    expect(reloadedState.tasks[0].title).toBe("New Task");
  });

  test("Store updates task status", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task to update" });
    let state = useTaskStore.getState();
    const taskId = state.tasks[0].id;

    await updateTask(taskId, { status: "in-progress" });
    state = useTaskStore.getState();
    expect(state.tasks[0].status).toBe("in-progress");
  });

  test("Store deletes task", async () => {
    const { addTask, deleteTask } = useTaskStore.getState();
    await addTask({ title: "Delete me" });
    let state = useTaskStore.getState();
    const taskId = state.tasks[0].id;

    await deleteTask(taskId);
    state = useTaskStore.getState();
    expect(state.tasks).toHaveLength(0);
  });
});
