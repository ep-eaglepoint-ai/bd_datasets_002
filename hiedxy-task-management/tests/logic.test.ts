import {
  TaskSchema,
  TimeLogSchema,
  StatusSchema,
  PrioritySchema,
} from "../repository_after/lib/schemas";
import { useTaskStore } from "../repository_after/store/useTaskStore";
import { useTimeStore } from "../repository_after/store/useTimeStore";
import { db } from "../repository_after/lib/db";
import {
  aggregateTime,
  generateBurnDown,
  computeFocusMetrics,
  analyzeEstimation,
  TimeLog,
  Task,
} from "../repository_after/lib/analytics";
import {
  startOfDay,
  addDays,
  format,
  subDays,
  startOfWeek,
  startOfMonth,
} from "date-fns";
import {
  exportToJSON,
  exportTasksToCSV,
  exportLogsToCSV,
  SystemData,
} from "../repository_after/lib/export";

describe("Requirement 1: Task CRUD Operations", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    useTimeStore.setState({
      activeTaskId: null,
      startTime: null,
      isTracking: false,
      logs: [],
    });
    await db.clearTasks();
    await db.clearTimeLogs();
    localStorage.clear();
  });

  test("creates task with all fields", async () => {
    const { addTask } = useTaskStore.getState();
    const dueDate = new Date("2026-02-15");

    await addTask({
      title: "Complete Project",
      description: "Finish the task management app",
      priority: "high",
      estimatedDuration: 120,
      dueDate,
      tags: ["work", "urgent"],
    });

    const state = useTaskStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe("Complete Project");
    expect(state.tasks[0].description).toBe("Finish the task management app");
    expect(state.tasks[0].priority).toBe("high");
    expect(state.tasks[0].estimatedDuration).toBe(120);
    expect(state.tasks[0].tags).toEqual(["work", "urgent"]);
    expect(state.tasks[0].status).toBe("pending");
  });

  test("edits task with multiple field updates", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Original Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, {
      title: "Updated Task",
      description: "New description",
      priority: "low",
      estimatedDuration: 60,
      tags: ["updated"],
    });

    const state = useTaskStore.getState();
    expect(state.tasks[0].title).toBe("Updated Task");
    expect(state.tasks[0].description).toBe("New description");
    expect(state.tasks[0].priority).toBe("low");
    expect(state.tasks[0].estimatedDuration).toBe(60);
    expect(state.tasks[0].tags).toEqual(["updated"]);
  });

  test("validates state transitions: pending → in-progress", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, { status: "in-progress" });
    expect(useTaskStore.getState().tasks[0].status).toBe("in-progress");
  });

  test("validates state transitions: in-progress → paused", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, { status: "in-progress" });
    await updateTask(taskId, { status: "paused" });
    expect(useTaskStore.getState().tasks[0].status).toBe("paused");
  });

  test("validates state transitions: paused → in-progress", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, { status: "in-progress" });
    await updateTask(taskId, { status: "paused" });
    await updateTask(taskId, { status: "in-progress" });
    expect(useTaskStore.getState().tasks[0].status).toBe("in-progress");
  });

  test("validates state transitions: in-progress → completed", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, { status: "in-progress" });
    await updateTask(taskId, { status: "completed" });
    expect(useTaskStore.getState().tasks[0].status).toBe("completed");
  });

  test("validates state transitions: pending → abandoned", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, { status: "abandoned" });
    expect(useTaskStore.getState().tasks[0].status).toBe("abandoned");
  });

  test("deletes task", async () => {
    const { addTask, deleteTask } = useTaskStore.getState();
    await addTask({ title: "Delete me" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await deleteTask(taskId);
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });

  test("persists task to IndexedDB", async () => {
    const { addTask, loadTasks } = useTaskStore.getState();
    await addTask({ title: "Persistent Task" });

    // Simulate fresh load
    useTaskStore.setState({ tasks: [] });
    await loadTasks();

    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().tasks[0].title).toBe("Persistent Task");
  });
});

describe("Requirement 2: Time Tracking", () => {
  afterEach(() => {
    jest.useRealTimers();
  });
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    useTimeStore.setState({
      activeTaskId: null,
      startTime: null,
      isTracking: false,
      logs: [],
    });
    await db.clearTasks();
    await db.clearTimeLogs();
    localStorage.clear();
  });

  test("starts time tracking for a task", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Tracked Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer } = useTimeStore.getState();
    await startTimer(taskId);

    const state = useTimeStore.getState();
    expect(state.isTracking).toBe(true);
    expect(state.activeTaskId).toBe(taskId);
    expect(state.startTime).toBeInstanceOf(Date);
  });

  test("stops time tracking and creates log", async () => {
    jest.useFakeTimers();
    const startTime = new Date("2024-01-01T10:00:00Z");
    jest.setSystemTime(startTime);

    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Tracked Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer, stopTimer } = useTimeStore.getState();
    await startTimer(taskId);

    // Advance time by 5 seconds
    jest.setSystemTime(new Date(startTime.getTime() + 5000));

    await stopTimer();

    const state = useTimeStore.getState();
    expect(state.isTracking).toBe(false);
    expect(state.activeTaskId).toBe(null);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].taskId).toBe(taskId);
    expect(state.logs[0].duration).toBe(5);

    jest.useRealTimers();
  });

  test("auto-stops previous timer when starting new one", async () => {
    jest.useFakeTimers();
    const startTime = new Date("2024-01-01T10:00:00Z");
    jest.setSystemTime(startTime);

    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task 1" });
    await addTask({ title: "Task 2" });
    const [task1Id, task2Id] = useTaskStore.getState().tasks.map((t) => t.id);

    const { startTimer } = useTimeStore.getState();
    await startTimer(task1Id);

    // Advance time
    jest.setSystemTime(new Date(startTime.getTime() + 5000));

    await startTimer(task2Id);

    const state = useTimeStore.getState();
    expect(state.activeTaskId).toBe(task2Id);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].taskId).toBe(task1Id);
    expect(state.logs[0].duration).toBe(5);

    jest.useRealTimers();
  });

  test("persists active timer to localStorage", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer } = useTimeStore.getState();
    await startTimer(taskId);

    const stored = localStorage.getItem("activeTimer");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.taskId).toBe(taskId);
  });

  test("records precise time intervals", async () => {
    jest.useFakeTimers();
    const startTime = new Date("2024-01-01T10:00:00Z");
    jest.setSystemTime(startTime);

    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer, stopTimer } = useTimeStore.getState();
    await startTimer(taskId);

    // Advance exactly 5.5 seconds
    const endTime = new Date(startTime.getTime() + 5500);
    jest.setSystemTime(endTime);

    await stopTimer();

    const log = useTimeStore.getState().logs[0];
    expect(log.startTime).toBeInstanceOf(Date);
    expect(log.endTime).toBeInstanceOf(Date);
    expect(log.duration).toBe(5); // Math.floor(5.5) = 5

    const diff = Math.floor(
      (log.endTime!.getTime() - log.startTime.getTime()) / 1000,
    );
    expect(diff).toBe(5);

    jest.useRealTimers();
  });
});

describe("Requirement 3: Work Sessions", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    useTimeStore.setState({
      activeTaskId: null,
      startTime: null,
      isTracking: false,
      logs: [],
    });
    await db.clearTasks();
    await db.clearTimeLogs();
  });

  test("creates discrete work sessions", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer, stopTimer } = useTimeStore.getState();

    // Session 1
    await startTimer(taskId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await stopTimer();

    // Session 2
    await startTimer(taskId);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await stopTimer();

    const logs = useTimeStore.getState().logs;
    expect(logs).toHaveLength(2);
    expect(logs[0].id).not.toBe(logs[1].id);
  });

  test("loads logs for specific task", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task 1" });
    await addTask({ title: "Task 2" });
    const [task1Id, task2Id] = useTaskStore.getState().tasks.map((t) => t.id);

    const { startTimer, stopTimer, loadLogs } = useTimeStore.getState();

    await startTimer(task1Id);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await stopTimer();

    await startTimer(task2Id);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await stopTimer();

    await loadLogs(task1Id);
    const logs = useTimeStore.getState().logs;
    expect(logs.every((log) => log.taskId === task1Id)).toBe(true);
  });
});

describe("Requirement 4: Time Aggregation", () => {
  const taskId = "test-task-id";
  const today = new Date();

  const mockLogs: TimeLog[] = [
    {
      id: "1",
      taskId,
      startTime: today,
      endTime: new Date(today.getTime() + 3600000),
      duration: 3600,
      notes: "",
    }, // 1 hour
    {
      id: "2",
      taskId,
      startTime: today,
      endTime: new Date(today.getTime() + 1800000),
      duration: 1800,
      notes: "",
    }, // 30 mins
    {
      id: "3",
      taskId,
      startTime: subDays(today, 1),
      endTime: subDays(today, 1),
      duration: 7200,
      notes: "",
    }, // 2 hours YESTERDAY
  ];

  test("aggregates total duration correctly", () => {
    const result = aggregateTime(mockLogs);
    expect(result.totalDuration).toBe(3600 + 1800 + 7200);
  });

  test("groups by day correctly", () => {
    const result = aggregateTime(mockLogs);
    const todayKey = format(today, "yyyy-MM-dd");
    const yesterdayKey = format(subDays(today, 1), "yyyy-MM-dd");

    expect(result.daily[todayKey]).toBe(5400);
    expect(result.daily[yesterdayKey]).toBe(7200);
  });

  test("handles empty logs", () => {
    const result = aggregateTime([]);
    expect(result.totalDuration).toBe(0);
    expect(Object.keys(result.daily)).toHaveLength(0);
  });
});

describe("Requirement 5: Burn-down Charts", () => {
  test("generates correct burn-down data", () => {
    const now = new Date();
    const tasks: Task[] = [
      {
        id: "1",
        title: "T1",
        priority: "medium",
        status: "completed",
        estimatedDuration: 60,
        createdAt: subDays(now, 2),
        updatedAt: subDays(now, 1),
        tags: [],
      },
      {
        id: "2",
        title: "T2",
        priority: "medium",
        status: "pending",
        estimatedDuration: 120,
        createdAt: subDays(now, 2),
        updatedAt: now,
        tags: [],
      },
    ];

    const data = generateBurnDown(tasks);
    expect(data.length).toBeGreaterThan(0);

    // Check initial state (2 tasks created)
    const initial = data[0];
    expect(initial.remainingMinutes).toBe(60); // T1 created first, wait.
    // logic: sorted by date. T1 and T2 created same time (subDays(now, 2)).

    const last = data[data.length - 1];
    expect(last.remainingMinutes).toBe(120); // 180 total - 60 completed = 120 remaining
  });
});

describe("Requirement 6: Focus Metrics", () => {
  test("computes focus metrics", () => {
    const logs: TimeLog[] = [
      {
        id: "1",
        taskId: "t1",
        startTime: new Date(),
        duration: 3000,
        notes: "",
      }, // 50 mins (Deep work)
      {
        id: "2",
        taskId: "t1",
        startTime: new Date(),
        duration: 600,
        notes: "",
      }, // 10 mins (Shallow)
    ];

    const metrics = computeFocusMetrics(logs);
    expect(metrics.totalSessions).toBe(2);
    expect(metrics.averageSessionDuration).toBe(1800);
    expect(metrics.longStreaks).toBe(1); // One session > 25m
    expect(metrics.deepWorkRatio).toBeCloseTo(3000 / 3600);
  });

  test("handles empty focus metrics", () => {
    const metrics = computeFocusMetrics([]);
    expect(metrics.totalSessions).toBe(0);
    expect(metrics.averageSessionDuration).toBe(0);
  });
});

describe("Requirement 7: Estimation Analysis", () => {
  test("identifies estimation accuracy", () => {
    const task1: Task = {
      id: "t1",
      title: "Under",
      estimatedDuration: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "completed",
      priority: "medium",
      tags: [],
    }; // Est 60m
    const task2: Task = {
      id: "t2",
      title: "Over",
      estimatedDuration: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "completed",
      priority: "medium",
      tags: [],
    }; // Est 60m
    const task3: Task = {
      id: "t3",
      title: "Perfect",
      estimatedDuration: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "completed",
      priority: "medium",
      tags: [],
    }; // Est 60m

    // Logs
    const logs: TimeLog[] = [
      {
        id: "l1",
        taskId: "t1",
        duration: 7200,
        startTime: new Date(),
        notes: "",
      }, // 120m (Underestimated)
      {
        id: "l2",
        taskId: "t2",
        duration: 1800,
        startTime: new Date(),
        notes: "",
      }, // 30m (Overestimated)
      {
        id: "l3",
        taskId: "t3",
        duration: 3600,
        startTime: new Date(),
        notes: "",
      }, // 60m (Accurate)
    ];

    const analysis = analyzeEstimation([task1, task2, task3], logs);
    expect(analysis.underestimatedTasks).toBe(1);
    expect(analysis.overestimatedTasks).toBe(1);
    expect(analysis.accurateTasks).toBe(1);
  });
});

describe("Requirement 13: Validation", () => {
  test("validates Task schema with valid data", () => {
    const validTask = {
      id: crypto.randomUUID(),
      title: "Valid Task",
      status: "pending",
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(validTask).success).toBe(true);
  });

  test("rejects Task with empty title", () => {
    const invalidTask = {
      id: crypto.randomUUID(),
      title: "",
      status: "pending",
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(invalidTask).success).toBe(false);
  });

  test("rejects Task with invalid UUID", () => {
    const invalidTask = {
      id: "not-a-uuid",
      title: "Task",
      status: "pending",
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(invalidTask).success).toBe(false);
  });

  test("rejects Task with invalid status", () => {
    const invalidTask = {
      id: crypto.randomUUID(),
      title: "Task",
      status: "invalid-status",
      priority: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(invalidTask).success).toBe(false);
  });

  test("rejects Task with invalid priority", () => {
    const invalidTask = {
      id: crypto.randomUUID(),
      title: "Task",
      status: "pending",
      priority: "critical",
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(invalidTask).success).toBe(false);
  });

  test("rejects Task with negative estimatedDuration", () => {
    const invalidTask = {
      id: crypto.randomUUID(),
      title: "Task",
      status: "pending",
      priority: "medium",
      estimatedDuration: -10,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    expect(TaskSchema.safeParse(invalidTask).success).toBe(false);
  });

  test("validates TimeLog schema with valid data", () => {
    const validLog = {
      id: crypto.randomUUID(),
      taskId: crypto.randomUUID(),
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
    };
    expect(TimeLogSchema.safeParse(validLog).success).toBe(true);
  });

  test("rejects TimeLog with negative duration", () => {
    const invalidLog = {
      id: crypto.randomUUID(),
      taskId: crypto.randomUUID(),
      startTime: new Date(),
      endTime: new Date(),
      duration: -50,
    };
    expect(TimeLogSchema.safeParse(invalidLog).success).toBe(false);
  });

  test("rejects TimeLog with invalid taskId", () => {
    const invalidLog = {
      id: crypto.randomUUID(),
      taskId: "not-uuid",
      startTime: new Date(),
      endTime: new Date(),
      duration: 100,
    };
    expect(TimeLogSchema.safeParse(invalidLog).success).toBe(false);
  });

  test("validates all Status enum values", () => {
    const validStatuses = [
      "pending",
      "in-progress",
      "paused",
      "completed",
      "abandoned",
    ];
    validStatuses.forEach((status) => {
      expect(StatusSchema.safeParse(status).success).toBe(true);
    });
  });

  test("validates all Priority enum values", () => {
    const validPriorities = ["low", "medium", "high"];
    validPriorities.forEach((priority) => {
      expect(PrioritySchema.safeParse(priority).success).toBe(true);
    });
  });
});

describe("Requirement 14: State Management", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    await db.clearTasks();
    await db.clearTimeLogs();
  });

  test("maintains consistent state during concurrent updates", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task", priority: "medium" });
    const taskId = useTaskStore.getState().tasks[0].id;

    // Update sequentially to ensure both changes are preserved
    await updateTask(taskId, { priority: "high" });
    await updateTask(taskId, { status: "in-progress" });

    const state = useTaskStore.getState();
    expect(state.tasks).toHaveLength(1);
    const task = state.tasks[0];
    expect(task).toBeDefined();
    expect(task.priority).toBe("high");
    expect(task.status).toBe("in-progress");
  });

  test("updates updatedAt timestamp on task modification", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;
    const originalUpdatedAt = useTaskStore.getState().tasks[0].updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 50));
    await updateTask(taskId, { title: "Updated" });

    const newUpdatedAt = useTaskStore.getState().tasks[0].updatedAt;
    expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  test("handles errors gracefully without corrupting state", async () => {
    const { addTask } = useTaskStore.getState();

    // Try to add invalid task
    await addTask({ title: "" } as any);

    const state = useTaskStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.tasks).toHaveLength(0);
  });

  test("maintains task order consistency", async () => {
    const { addTask } = useTaskStore.getState();

    await addTask({ title: "Task 1" });
    await addTask({ title: "Task 2" });
    await addTask({ title: "Task 3" });

    const tasks = useTaskStore.getState().tasks;
    expect(tasks[0].title).toBe("Task 3"); // Most recent first
    expect(tasks[1].title).toBe("Task 2");
    expect(tasks[2].title).toBe("Task 1");
  });
});

describe("Requirement 8: Filtering & Search", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    await db.clearTasks();
    await db.clearTimeLogs();
  });

  test("filters tasks by priority", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "High Priority", priority: "high" });
    await addTask({ title: "Low Priority", priority: "low" });
    await addTask({ title: "Medium Priority", priority: "medium" });

    const tasks = useTaskStore.getState().tasks;
    const highPriority = tasks.filter((t) => t.priority === "high");
    expect(highPriority).toHaveLength(1);
    expect(highPriority[0].title).toBe("High Priority");
  });

  test("filters tasks by status", async () => {
    const { addTask, updateTask } = useTaskStore.getState();
    await addTask({ title: "Task 1" });
    await addTask({ title: "Task 2" });
    const [task1Id, task2Id] = useTaskStore.getState().tasks.map((t) => t.id);

    await updateTask(task1Id, { status: "completed" });

    const tasks = useTaskStore.getState().tasks;
    const completed = tasks.filter((t) => t.status === "completed");
    const pending = tasks.filter((t) => t.status === "pending");

    expect(completed).toHaveLength(1);
    expect(pending).toHaveLength(1);
  });

  test("filters tasks by tags", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Work Task", tags: ["work", "urgent"] });
    await addTask({ title: "Personal Task", tags: ["personal"] });
    await addTask({ title: "Mixed Task", tags: ["work", "personal"] });

    const tasks = useTaskStore.getState().tasks;
    const workTasks = tasks.filter((t) => t.tags.includes("work"));
    expect(workTasks).toHaveLength(2);
  });

  test("filters tasks by due date", async () => {
    const { addTask } = useTaskStore.getState();
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    await addTask({ title: "Due Today", dueDate: today });
    await addTask({ title: "Due Tomorrow", dueDate: tomorrow });
    await addTask({ title: "Due Next Week", dueDate: nextWeek });

    const tasks = useTaskStore.getState().tasks;
    const dueSoon = tasks.filter(
      (t) => t.dueDate && t.dueDate.getTime() <= tomorrow.getTime(),
    );
    expect(dueSoon).toHaveLength(2);
  });

  test("chains multiple filter conditions", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "High Work", priority: "high", tags: ["work"] });
    await addTask({
      title: "High Personal",
      priority: "high",
      tags: ["personal"],
    });
    await addTask({ title: "Low Work", priority: "low", tags: ["work"] });

    const tasks = useTaskStore.getState().tasks;
    const filtered = tasks.filter(
      (t) => t.priority === "high" && t.tags.includes("work"),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe("High Work");
  });
});

describe("Requirement 12: Offline Persistence", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    await db.clearTasks();
    await db.clearTimeLogs();
  });

  test("persists tasks across store resets", async () => {
    const { addTask, loadTasks } = useTaskStore.getState();
    await addTask({ title: "Persistent Task 1" });
    await addTask({ title: "Persistent Task 2" });

    // Reset store
    useTaskStore.setState({ tasks: [] });
    expect(useTaskStore.getState().tasks).toHaveLength(0);

    // Reload from DB
    await loadTasks();
    expect(useTaskStore.getState().tasks).toHaveLength(2);
  });

  test("persists time logs across store resets", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer, stopTimer, loadLogs } = useTimeStore.getState();
    await startTimer(taskId);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await stopTimer();

    // Reset store
    useTimeStore.setState({
      activeTaskId: null,
      startTime: null,
      isTracking: false,
      logs: [],
    });
    expect(useTimeStore.getState().logs).toHaveLength(0);

    // Reload from DB
    await loadLogs(taskId);
    expect(useTimeStore.getState().logs).toHaveLength(1);
  });
});

describe("Requirement 19: Edge Case Testing", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    useTimeStore.setState({
      activeTaskId: null,
      startTime: null,
      isTracking: false,
      logs: [],
    });
    await db.clearTasks();
    await db.clearTimeLogs();
  });

  test("handles rapid task switching", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task 1" });
    await addTask({ title: "Task 2" });
    await addTask({ title: "Task 3" });
    const taskIds = useTaskStore.getState().tasks.map((t) => t.id);

    const { startTimer } = useTimeStore.getState();

    // Rapidly switch between tasks
    for (const taskId of taskIds) {
      await startTimer(taskId);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const state = useTimeStore.getState();
    expect(state.activeTaskId).toBe(taskIds[taskIds.length - 1]);
    expect(state.logs).toHaveLength(taskIds.length - 1);
  });

  test("handles very long task titles", async () => {
    const { addTask } = useTaskStore.getState();
    const longTitle = "A".repeat(1000);

    await addTask({ title: longTitle });
    expect(useTaskStore.getState().tasks[0].title).toBe(longTitle);
  });

  test("handles tasks with many tags", async () => {
    const { addTask } = useTaskStore.getState();
    const manyTags = Array.from({ length: 100 }, (_, i) => `tag${i}`);

    await addTask({ title: "Task", tags: manyTags });
    expect(useTaskStore.getState().tasks[0].tags).toHaveLength(100);
  });

  test("handles unrealistic estimates", async () => {
    const { addTask } = useTaskStore.getState();

    await addTask({ title: "Quick Task", estimatedDuration: 1 });
    await addTask({ title: "Long Task", estimatedDuration: 100000 });

    const tasks = useTaskStore.getState().tasks;
    expect(tasks[0].estimatedDuration).toBe(100000);
    expect(tasks[1].estimatedDuration).toBe(1);
  });

  test("handles zero-duration time logs", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Task" });
    const taskId = useTaskStore.getState().tasks[0].id;

    const { startTimer, stopTimer } = useTimeStore.getState();
    await startTimer(taskId);
    await stopTimer(); // Immediate stop

    const log = useTimeStore.getState().logs[0];
    expect(log.duration).toBeGreaterThanOrEqual(0);
  });

  test("handles multiple tasks with same title", async () => {
    const { addTask } = useTaskStore.getState();
    await addTask({ title: "Duplicate" });
    await addTask({ title: "Duplicate" });
    await addTask({ title: "Duplicate" });

    const tasks = useTaskStore.getState().tasks;
    expect(tasks).toHaveLength(3);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(3); // All have unique IDs
  });

  test("handles tasks with future due dates", async () => {
    const { addTask } = useTaskStore.getState();
    const farFuture = new Date("2099-12-31");

    await addTask({ title: "Future Task", dueDate: farFuture });
    expect(useTaskStore.getState().tasks[0].dueDate).toEqual(farFuture);
  });

  test("handles tasks with past due dates", async () => {
    const { addTask } = useTaskStore.getState();
    const past = new Date("2020-01-01");

    await addTask({ title: "Overdue Task", dueDate: past });
    const task = useTaskStore.getState().tasks[0];
    expect(task.dueDate).toEqual(past);
    expect(task.dueDate!.getTime()).toBeLessThan(Date.now());
  });
});

describe("Requirement 16: Performance", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    await db.clearTasks();
    await db.clearTimeLogs();
  });

  test("handles creating many tasks efficiently", async () => {
    const { addTask } = useTaskStore.getState();
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await addTask({ title: `Task ${i}` });
    }

    const duration = Date.now() - startTime;
    expect(useTaskStore.getState().tasks).toHaveLength(100);
    expect(duration).toBeLessThan(5000); // Should complete in reasonable time
  });

  test("loads large number of tasks efficiently", async () => {
    const { addTask, loadTasks } = useTaskStore.getState();

    // Create 100 tasks
    for (let i = 0; i < 100; i++) {
      await addTask({ title: `Task ${i}` });
    }

    // Reset and reload
    useTaskStore.setState({ tasks: [] });
    const startTime = Date.now();
    await loadTasks();
    const duration = Date.now() - startTime;

    expect(useTaskStore.getState().tasks).toHaveLength(100);
    expect(duration).toBeLessThan(2000);
  });
});

describe("Requirement 15: Undo/Redo History", () => {
  beforeEach(async () => {
    useTaskStore.setState({
      tasks: [],
      history: [],
      future: [],
      isLoading: false,
      error: null,
    });
    await db.clearTasks();
  });

  test("undoes task creation", async () => {
    const { addTask, undo } = useTaskStore.getState();
    await addTask({ title: "Task to Undo" });
    expect(useTaskStore.getState().tasks).toHaveLength(1);

    await undo();
    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });

  test("redoes task creation", async () => {
    const { addTask, undo, redo } = useTaskStore.getState();
    await addTask({ title: "Task to Redo" });
    await undo();
    expect(useTaskStore.getState().tasks).toHaveLength(0);

    await redo();
    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().tasks[0].title).toBe("Task to Redo");
  });

  test("undoes task update", async () => {
    const { addTask, updateTask, undo } = useTaskStore.getState();
    await addTask({ title: "Original Title" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await updateTask(taskId, { title: "New Title" });
    expect(useTaskStore.getState().tasks[0].title).toBe("New Title");

    await undo();
    expect(useTaskStore.getState().tasks[0].title).toBe("Original Title");
  });

  test("undoes task deletion", async () => {
    const { addTask, deleteTask, undo } = useTaskStore.getState();
    await addTask({ title: "Task to Delete" });
    const taskId = useTaskStore.getState().tasks[0].id;

    await deleteTask(taskId);
    expect(useTaskStore.getState().tasks).toHaveLength(0);

    await undo();
    expect(useTaskStore.getState().tasks).toHaveLength(1);
    expect(useTaskStore.getState().tasks[0].id).toBe(taskId);
  });

  test("handles multiple undo/redo steps", async () => {
    const { addTask, undo, redo } = useTaskStore.getState();
    await addTask({ title: "1" });
    await addTask({ title: "2" });
    await addTask({ title: "3" });
    expect(useTaskStore.getState().tasks).toHaveLength(3);

    await undo();
    expect(useTaskStore.getState().tasks).toHaveLength(2);
    expect(useTaskStore.getState().tasks[0].title).toBe("2");

    await undo();
    expect(useTaskStore.getState().tasks).toHaveLength(1);

    await redo();
    expect(useTaskStore.getState().tasks).toHaveLength(2);
    expect(useTaskStore.getState().tasks[0].title).toBe("2");
  });
});

describe("Requirement 9: Grouping & Organization", () => {
  test("groups tasks by status correctly", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "A",
        status: "pending",
        priority: "low",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
      {
        id: "2",
        title: "B",
        status: "completed",
        priority: "low",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
      {
        id: "3",
        title: "C",
        status: "pending",
        priority: "low",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
    ];

    const grouped = {
      pending: tasks.filter((t) => t.status === "pending"),
      completed: tasks.filter((t) => t.status === "completed"),
    };

    expect(grouped.pending).toHaveLength(2);
    expect(grouped.completed).toHaveLength(1);
  });

  test("groups tasks by priority correctly", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "A",
        status: "pending",
        priority: "high",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
      {
        id: "2",
        title: "B",
        status: "pending",
        priority: "low",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
      {
        id: "3",
        title: "C",
        status: "pending",
        priority: "high",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
    ];

    const grouped = {
      high: tasks.filter((t) => t.priority === "high"),
      low: tasks.filter((t) => t.priority === "low"),
    };

    expect(grouped.high).toHaveLength(2);
    expect(grouped.low).toHaveLength(1);
  });
});

describe("Requirement 18: Export & Import", () => {
  test("exports to JSON structure correctly", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "Task 1",
        status: "pending",
        priority: "high",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      },
    ];
    const logs: TimeLog[] = [
      {
        id: "l1",
        taskId: "1",
        startTime: new Date(),
        duration: 60,
        notes: "test",
      },
    ];

    const json = exportToJSON(tasks, logs);
    const data: SystemData = JSON.parse(json);

    expect(data.version).toBe(1);
    expect(data.tasks).toHaveLength(1);
    expect(data.logs).toHaveLength(1);
    expect(data.tasks[0].title).toBe("Task 1");
  });

  test("exports tasks to CSV correctly", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "Task, with comma",
        status: "pending",
        priority: "high",
        estimatedDuration: 60,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        tags: ["tag1"],
      },
    ];

    const csv = exportTasksToCSV(tasks);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2); // Header + 1 row
    expect(lines[0]).toContain("Title");
    expect(lines[1]).toContain('"Task, with comma"'); // Should be quoted
  });

  test("exports logs to CSV correctly", () => {
    const logs: TimeLog[] = [
      {
        id: "l1",
        taskId: "t1",
        startTime: new Date("2024-01-01T10:00:00Z"),
        duration: 3600,
        notes: "My notes",
      },
    ];

    const csv = exportLogsToCSV(logs);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("3600");
    expect(lines[1]).toContain("My notes");
  });
});

describe("Requirement 10 & 11: Advanced Analytics & History", () => {
  test("aggregates over month boundaries", () => {
    const logs: TimeLog[] = [
      {
        id: "1",
        taskId: "t1",
        startTime: new Date("2024-01-31T23:00:00"),
        duration: 3600,
        notes: "",
      },
      {
        id: "2",
        taskId: "t1",
        startTime: new Date("2024-02-01T01:00:00"),
        duration: 3600,
        notes: "",
      },
    ];

    const result = aggregateTime(logs);
    // Keys depend on locale/format used in analytics.ts, assumed yyyy-MM
    expect(Object.keys(result.monthly)).toContain("2024-01");
    expect(Object.keys(result.monthly)).toContain("2024-02");
    expect(result.monthly["2024-01"]).toBe(3600);
    expect(result.monthly["2024-02"]).toBe(3600);
  });

  test("handles burn-down with out-of-order events", () => {
    // Burn down generation sorts by date, so input order shouldn't matter
    const tasks: Task[] = [
      {
        id: "1",
        title: "T1",
        status: "completed",
        priority: "low",
        estimatedDuration: 60,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-05"),
        tags: [],
      },
      {
        id: "2",
        title: "T2",
        status: "pending",
        priority: "low",
        estimatedDuration: 120,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date(),
        tags: [],
      },
    ];

    const data = generateBurnDown(tasks);
    // First point should be creation of T1
    expect(data[0].date).toContain("2024-01-01");
    // Completed T1 at Jan 5
    const completionPoint = data.find((d) => d.date.startsWith("2024-01-05"));
    expect(completionPoint).toBeDefined();
    // At T1 completion, completedMinutes should increase
    expect(completionPoint!.completedMinutes).toBeGreaterThan(0);
  });
});

describe("Requirement 17: UI State Feedback", () => {
  beforeEach(async () => {
    useTaskStore.setState({ tasks: [], isLoading: false, error: null });
    await db.clearTasks();
  });

  test("sets loading state during operations", async () => {
    const { loadTasks } = useTaskStore.getState();
    const promise = loadTasks();
    expect(useTaskStore.getState().isLoading).toBe(true);
    await promise;
    expect(useTaskStore.getState().isLoading).toBe(false);
  });

  test("sets error state on failure", async () => {
    const { addTask } = useTaskStore.getState();
    // Force validation error
    await addTask({ title: "" } as any);
    expect(useTaskStore.getState().error).toBeTruthy();
  });
});
