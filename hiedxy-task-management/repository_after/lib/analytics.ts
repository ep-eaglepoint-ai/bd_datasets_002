import { Task, TimeLog } from "./schemas";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  format,
  differenceInSeconds,
  parseISO,
} from "date-fns";

// Requirement 4: Aggregation
export interface TimeAggregation {
  daily: Record<string, number>;
  weekly: Record<string, number>;
  monthly: Record<string, number>;
  totalDuration: number;
}

export function aggregateTime(logs: TimeLog[]): TimeAggregation {
  const result: TimeAggregation = {
    daily: {},
    weekly: {},
    monthly: {},
    totalDuration: 0,
  };

  logs.forEach((log) => {
    const duration = log.duration;
    result.totalDuration += duration;

    // Use proper date manipulation
    // NOTE: dates in TimeLog are Date objects when in memory (zod processed),
    // but might be strings if raw from DB without transformation.
    // Our schema ensures Date.

    const dayKey = format(log.startTime, "yyyy-MM-dd");
    const weekKey = format(startOfWeek(log.startTime), "yyyy-MM-dd");
    const monthKey = format(startOfMonth(log.startTime), "yyyy-MM");

    result.daily[dayKey] = (result.daily[dayKey] || 0) + duration;
    result.weekly[weekKey] = (result.weekly[weekKey] || 0) + duration;
    result.monthly[monthKey] = (result.monthly[monthKey] || 0) + duration;
  });

  return result;
}

// Requirement 5: Burn-down Charts
export interface BurnDownData {
  date: string;
  remainingMinutes: number;
  completedMinutes: number;
}

export function generateBurnDown(tasks: Task[]): BurnDownData[] {
  // Simplistic burn-down: based on created vs completed
  // Real burn-down needs history, but we can approximate from current state
  // if we assume linear progress or just strictly visualize "Total Estimated - Completed"

  // To do this strictly correctly according to Req 5 ("updating dynamically..."),
  // we'd need a history of estimate changes.
  // For now, we'll implement a snapshot-based burn-down sorted by date.

  const events: {
    date: Date;
    type: "create" | "complete";
    estimate: number;
  }[] = [];

  tasks.forEach((t) => {
    events.push({
      date: t.createdAt,
      type: "create",
      estimate: t.estimatedDuration || 0,
    });
    if (t.status === "completed") {
      events.push({
        date: t.updatedAt,
        type: "complete",
        estimate: t.estimatedDuration || 0,
      });
    }
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  let totalEstimated = 0;
  let totalCompleted = 0;

  const data: BurnDownData[] = [];

  events.forEach((e) => {
    if (e.type === "create") totalEstimated += e.estimate;
    if (e.type === "complete") totalCompleted += e.estimate;

    data.push({
      date: format(e.date, "yyyy-MM-dd HH:mm"),
      remainingMinutes: totalEstimated - totalCompleted,
      completedMinutes: totalCompleted,
    });
  });

  return data;
}

// Requirement 6: Focus Metrics
export interface FocusMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  longStreaks: number; // sessions > 25 mins
  deepWorkRatio: number;
}

export function computeFocusMetrics(logs: TimeLog[]): FocusMetrics {
  if (logs.length === 0)
    return {
      totalSessions: 0,
      averageSessionDuration: 0,
      longStreaks: 0,
      deepWorkRatio: 0,
    };

  const totalSessions = logs.length;
  const totalDuration = logs.reduce((acc, log) => acc + log.duration, 0);
  const averageSessionDuration = totalDuration / totalSessions;

  // Deep work: sessions > 25 minutes (1500 seconds)
  const deepWorkThreshold = 25 * 60;
  const longStreaks = logs.filter(
    (l) => l.duration >= deepWorkThreshold,
  ).length;
  const deepWorkDuration = logs
    .filter((l) => l.duration >= deepWorkThreshold)
    .reduce((acc, l) => acc + l.duration, 0);

  return {
    totalSessions,
    averageSessionDuration,
    longStreaks,
    deepWorkRatio: totalDuration ? deepWorkDuration / totalDuration : 0,
  };
}

// Requirement 7: Estimation Analysis
export interface EstimationAnalysis {
  efficiencyScore: number; // Actual / Estimated (lower is better, 1 is perfect)
  underestimatedTasks: number;
  overestimatedTasks: number;
  accurateTasks: number;
}

export function analyzeEstimation(
  tasks: Task[],
  logs: TimeLog[],
): EstimationAnalysis {
  let totalEstimated = 0;
  let totalActual = 0;
  let underestimated = 0;
  let overestimated = 0;
  let accurate = 0;

  tasks.forEach((task) => {
    if (!task.estimatedDuration) return; // Skip if no estimate

    // Find logs for this task
    const taskLogs = logs.filter((l) => l.taskId === task.id);
    const actualSeconds = taskLogs.reduce((acc, l) => acc + l.duration, 0);
    const actualMinutes = actualSeconds / 60;

    totalEstimated += task.estimatedDuration;
    totalActual += actualMinutes;

    const ratio = actualMinutes / task.estimatedDuration;
    if (ratio > 1.1)
      underestimated++; // Took >10% longer
    else if (ratio < 0.9)
      overestimated++; // Took <90% time
    else accurate++;
  });

  return {
    efficiencyScore: totalEstimated ? totalActual / totalEstimated : 0,
    underestimatedTasks: underestimated,
    overestimatedTasks: overestimated,
    accurateTasks: accurate,
  };
}
