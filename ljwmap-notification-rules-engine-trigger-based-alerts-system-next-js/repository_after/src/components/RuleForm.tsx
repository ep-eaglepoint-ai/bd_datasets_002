"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Toggle, Card, CardContent, CardFooter } from "./ui";
import { ConditionBuilder } from "./ConditionBuilder";
import { PRIORITIES, OPERATORS } from "@/lib/validators";
import { COMMON_EVENT_TYPES } from "@/lib/validators/event";
import { AVAILABLE_CHANNELS } from "@/lib/channels";

interface Condition {
  id?: string;
  field: string;
  operator: string;
  value: string;
}

interface RuleFormData {
  name: string;
  description: string;
  eventType: string;
  priority: string;
  cooldownMs: number;
  channels: string[];
  webhookUrl: string;
  enabled: boolean;
  conditions: Condition[];
}

interface RuleFormProps {
  initialData?: Partial<RuleFormData>;
  ruleId?: string;
}

const defaultFormData: RuleFormData = {
  name: "",
  description: "",
  eventType: "",
  priority: "medium",
  cooldownMs: 0,
  channels: ["in-app"],
  webhookUrl: "",
  enabled: true,
  conditions: [],
};

const cooldownOptions = [
  { value: "0", label: "No cooldown" },
  { value: "60000", label: "1 minute" },
  { value: "300000", label: "5 minutes" },
  { value: "900000", label: "15 minutes" },
  { value: "1800000", label: "30 minutes" },
  { value: "3600000", label: "1 hour" },
  { value: "86400000", label: "24 hours" },
];

export function RuleForm({ initialData, ruleId }: RuleFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<RuleFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!ruleId;

  const updateField = <K extends keyof RuleFormData>(
    field: K,
    value: RuleFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const toggleChannel = (channel: string) => {
    const channels = formData.channels.includes(channel)
      ? formData.channels.filter((c) => c !== channel)
      : [...formData.channels, channel];
    updateField("channels", channels);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Rule name is required";
    }
    if (!formData.eventType.trim()) {
      newErrors.eventType = "Event type is required";
    }
    if (formData.channels.length === 0) {
      newErrors.channels = "At least one channel is required";
    }
    if (formData.channels.includes("webhook") && !formData.webhookUrl.trim()) {
      newErrors.webhookUrl = "Webhook URL is required when webhook channel is selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const url = isEditing ? `/api/rules/${ruleId}` : "/api/rules";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ submit: data.error || "Failed to save rule" });
        return;
      }

      router.push("/rules");
      router.refresh();
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = PRIORITIES.map((p) => ({
    value: p.id,
    label: p.label,
  }));

  const eventTypeOptions = [
    { value: "", label: "Select or type custom..." },
    ...COMMON_EVENT_TYPES.map((e) => ({
      value: e.id,
      label: e.name,
    })),
  ];

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="name"
                label="Rule Name"
                placeholder="e.g., High Value Order Alert"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                error={errors.name}
              />
              
              <Select
                id="priority"
                label="Priority"
                options={priorityOptions}
                value={formData.priority}
                onChange={(e) => updateField("priority", e.target.value)}
              />
            </div>

            <Input
              id="description"
              label="Description (optional)"
              placeholder="Describe what this rule does..."
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Trigger</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  id="eventType"
                  label="Event Type"
                  options={eventTypeOptions}
                  value={COMMON_EVENT_TYPES.some((e) => e.id === formData.eventType) ? formData.eventType : ""}
                  onChange={(e) => updateField("eventType", e.target.value)}
                  error={errors.eventType}
                />
                {!COMMON_EVENT_TYPES.some((e) => e.id === formData.eventType) && formData.eventType && (
                  <p className="mt-1 text-sm text-black">
                    Custom event type: {formData.eventType}
                  </p>
                )}
              </div>
              
              <Input
                id="customEventType"
                label="Or enter custom event type"
                placeholder="e.g., custom_event_name"
                value={COMMON_EVENT_TYPES.some((e) => e.id === formData.eventType) ? "" : formData.eventType}
                onChange={(e) => updateField("eventType", e.target.value)}
              />
            </div>

            <Select
              id="cooldown"
              label="Cooldown (prevent duplicate notifications)"
              options={cooldownOptions}
              value={String(formData.cooldownMs)}
              onChange={(e) => updateField("cooldownMs", parseInt(e.target.value))}
            />
          </div>

          {/* Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Conditions</h3>
            <ConditionBuilder
              conditions={formData.conditions}
              onChange={(conditions) => updateField("conditions", conditions)}
            />
          </div>

          {/* Channels */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Delivery Channels</h3>
            
            <div className="space-y-3">
              {AVAILABLE_CHANNELS.map((channel) => (
                <label
                  key={channel.id}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel.id)}
                    onChange={() => toggleChannel(channel.id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-3">
                    <span className="font-medium text-black">{channel.name}</span>
                    <p className="text-sm text-black">{channel.description}</p>
                  </div>
                </label>
              ))}
              {errors.channels && (
                <p className="text-sm text-red-600">{errors.channels}</p>
              )}
            </div>

            {formData.channels.includes("webhook") && (
              <Input
                id="webhookUrl"
                label="Webhook URL"
                type="url"
                placeholder="https://example.com/webhook"
                value={formData.webhookUrl}
                onChange={(e) => updateField("webhookUrl", e.target.value)}
                error={errors.webhookUrl}
              />
            )}
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Status</h3>
            <Toggle
              enabled={formData.enabled}
              onChange={(enabled) => updateField("enabled", enabled)}
              label={formData.enabled ? "Rule is enabled" : "Rule is disabled"}
            />
          </div>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Update Rule"
              : "Create Rule"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
