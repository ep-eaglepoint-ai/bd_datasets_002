"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Select } from "./ui";
import { OPERATORS } from "@/lib/validators";

interface Condition {
  id?: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    onChange([...conditions, { field: "", operator: "eq", value: "" }]);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    onChange(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const operatorOptions = OPERATORS.map((op) => ({
    value: op.id,
    label: op.label,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-black">
          Conditions
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-1" />
          Add Condition
        </Button>
      </div>

      {conditions.length === 0 ? (
        <p className="text-sm text-black italic">
          No conditions - rule will match all events of this type
        </p>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Field (e.g., status)"
                  value={condition.field}
                  onChange={(e) =>
                    updateCondition(index, { field: e.target.value })
                  }
                />
                <Select
                  options={operatorOptions}
                  value={condition.operator}
                  onChange={(e) =>
                    updateCondition(index, { operator: e.target.value })
                  }
                />
                <Input
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(index, { value: e.target.value })
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeCondition(index)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-black">
        All conditions must match (AND logic). Use dot notation for nested
        fields (e.g., user.email, order.items.0.price)
      </p>
    </div>
  );
}
