"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft, Archive, CheckCircle2 } from "lucide-react";
import {
  toggleInstanceItem,
  updateInstanceStatus,
  deleteInstance,
} from "@/app/actions";
import Link from "next/link";

interface InstanceViewProps {
  instance: any; // Using any for simplicity here, but should be typed matches Prisma result
}

export default function ChecklistInstanceView({ instance }: InstanceViewProps) {
  const router = useRouter();
  // We use local state for optimistic UI updates
  const [items, setItems] = useState(instance.items);
  const [status, setStatus] = useState(instance.status);
  const [loading, setLoading] = useState(false);

  const completedCount = items.filter((i: any) => i.completed).length;
  const totalCount = items.length;
  const progress =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Check if all required items are done
  const allRequiredDone = items.every((i: any) => !i.required || i.completed);
  const canComplete = allRequiredDone && status === "ACTIVE";

  const handleToggle = async (itemId: string, currentCompleted: boolean) => {
    if (status === "ARCHIVED") return;

    // Optimistic update
    const newItems = items.map((i: any) =>
      i.id === itemId ? { ...i, completed: !currentCompleted } : i,
    );
    setItems(newItems);

    await toggleInstanceItem(itemId, !currentCompleted);
    router.refresh();
  };

  const handleComplete = async () => {
    setLoading(true);
    await updateInstanceStatus(instance.id, "COMPLETED");
    setStatus("COMPLETED");
    setLoading(false);
    router.refresh();
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this checklist?")) return;
    setLoading(true);
    await updateInstanceStatus(instance.id, "ARCHIVED");
    setStatus("ARCHIVED");
    setLoading(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to DELETE this checklist? This cannot be undone.",
      )
    )
      return;
    setLoading(true);
    await deleteInstance(instance.id);
    router.push("/instances");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/instances">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {instance.title}
              <Badge
                variant={
                  status === "COMPLETED"
                    ? "success"
                    : status === "ARCHIVED"
                      ? "secondary"
                      : "default"
                }
              >
                {status}
              </Badge>
            </h1>
            <p className="text-slate-500 text-sm">
              Template: {instance.template.title}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {status === "ACTIVE" && (
            <Button
              onClick={handleComplete}
              disabled={!canComplete || loading}
              className={canComplete ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Checklist
            </Button>
          )}
          {status !== "ARCHIVED" && (
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={loading}
            >
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          )}
          {status === "ARCHIVED" && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-100 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            progress === 100 ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-right text-sm text-slate-500">
        {completedCount} of {totalCount} tasks completed ({progress}%)
      </div>

      <div className="space-y-3">
        {items.map((item: any) => (
          <Card
            key={item.id}
            className={`transition-colors cursor-pointer border-l-4 ${
              item.completed
                ? "bg-slate-50 border-green-500 opacity-60"
                : "border-blue-500 hover:bg-slate-50"
            }`}
            onClick={() => handleToggle(item.id, item.completed)}
          >
            <CardContent className="p-4 flex items-start gap-4">
              <div
                className={`mt-1 flex-shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-colors ${
                  item.completed
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {item.completed && <Check className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p
                  className={`font-medium ${item.completed ? "line-through text-slate-500" : "text-slate-900"}`}
                >
                  {item.text}
                  {item.required && (
                    <span className="text-red-500 ml-1" title="Required">
                      *
                    </span>
                  )}
                </p>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {status === "ACTIVE" && !canComplete && (
        <p className="text-amber-600 text-sm text-center">
          Complete all required items marked with * to finish the checklist.
        </p>
      )}
    </div>
  );
}
