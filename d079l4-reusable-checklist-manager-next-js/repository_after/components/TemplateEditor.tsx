"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Trash2, Plus, ArrowUp, ArrowDown, Save } from "lucide-react";
import { createTemplate, updateTemplate } from "@/app/actions";

interface TemplateItemData {
  text: string;
  description?: string;
  required: boolean;
}

interface TemplateData {
  id?: string;
  title: string;
  description?: string;
  items: TemplateItemData[];
}

export default function TemplateEditor({
  initialData,
}: {
  initialData?: TemplateData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [items, setItems] = useState<TemplateItemData[]>(
    initialData?.items || [],
  );

  const addItem = () => {
    setItems([...items, { text: "", required: false }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof TemplateItemData,
    value: any,
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [
      newItems[targetIndex],
      newItems[index],
    ];
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      setLoading(false);
      return;
    }

    const payload = {
      title,
      description,
      items: items.map((item, index) => ({
        ...item,
        order: index, // Ensure order is implicit by array position
      })),
    };

    let result;
    if (initialData?.id) {
      result = await updateTemplate(initialData.id, payload);
    } else {
      result = await createTemplate(payload);
    }

    if (result.error) {
      setError(
        typeof result.error === "string" ? result.error : "Validation failed",
      );
      setLoading(false);
    } else {
      router.push("/templates");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {initialData ? "Edit Template" : "Create New Template"}
        </h1>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Template
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Basic information about this checklist template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Daily Standup"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description (Optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of when this list is used..."
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Checklist Items</h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>

        {items.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">
            No items yet. Click "Add Item" to start building your list.
          </div>
        )}

        {items.map((item, index) => (
          <Card key={index} className="relative group">
            <CardContent className="p-4 flex gap-4 items-start">
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-xs text-slate-400 w-6 text-center">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  value={item.text}
                  onChange={(e) => updateItem(index, "text", e.target.value)}
                  placeholder="Item text..."
                  className="font-medium"
                />
                <Input
                  value={item.description || ""}
                  onChange={(e) =>
                    updateItem(index, "description", e.target.value)
                  }
                  placeholder="Additional details (optional)"
                  className="text-xs text-slate-500 h-8"
                />
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={(e) =>
                      updateItem(index, "required", e.target.checked)
                    }
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  Required item
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, "up")}
                  disabled={index === 0}
                  title="Move Up"
                >
                  <ArrowUp className="h-4 w-4 text-slate-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveItem(index, "down")}
                  disabled={index === items.length - 1}
                  title="Move Down"
                >
                  <ArrowDown className="h-4 w-4 text-slate-500" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Remove Item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </form>
  );
}
