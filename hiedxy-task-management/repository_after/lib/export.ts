import { Task, TimeLog } from "./schemas";
import { format } from "date-fns";

export interface SystemData {
  version: number;
  timestamp: string;
  tasks: Task[];
  logs: TimeLog[];
}

export function exportToJSON(tasks: Task[], logs: TimeLog[]): string {
  const data: SystemData = {
    version: 1,
    timestamp: new Date().toISOString(),
    tasks,
    logs,
  };
  return JSON.stringify(data, null, 2);
}

export function exportTasksToCSV(tasks: Task[]): string {
  const headers = [
    "ID",
    "Title",
    "Description",
    "Status",
    "Priority",
    "EstimatedDuration",
    "DueDate",
    "Tags",
    "CreatedAt",
    "UpdatedAt",
  ];

  const rows = tasks.map((t) => [
    t.id,
    escapeCSV(t.title),
    escapeCSV(t.description || ""),
    t.status,
    t.priority,
    t.estimatedDuration?.toString() || "",
    t.dueDate ? format(t.dueDate, "yyyy-MM-dd") : "",
    escapeCSV(t.tags.join(",")),
    t.createdAt.toISOString(),
    t.updatedAt.toISOString(),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportLogsToCSV(logs: TimeLog[]): string {
  const headers = [
    "ID",
    "TaskID",
    "StartTime",
    "EndTime",
    "DurationSeconds",
    "Notes",
  ];

  const rows = logs.map((l) => [
    l.id,
    l.taskId,
    l.startTime.toISOString(),
    l.endTime?.toISOString() || "",
    l.duration.toString(),
    escapeCSV(l.notes || ""),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCSV(str: string): string {
  if (!str) return "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
