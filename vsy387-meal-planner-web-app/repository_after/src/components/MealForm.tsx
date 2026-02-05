'use client';

import { useState } from 'react';
import { MealInputSchema } from '@/lib/schemas';
import { Meal } from '@/types';
import { ZodError } from 'zod';

interface IngredientInput {
  name: string;
  quantity: string;
  unit: string;
}

interface MealFormProps {
  meal?: Meal;
  onSubmit: (data: {
    name: string;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export default function MealForm({ meal, onSubmit, onCancel }: MealFormProps) {
  const [name, setName] = useState(meal?.name || '');
  const [notes, setNotes] = useState(meal?.notes || '');
  const [ingredients, setIngredients] = useState<IngredientInput[]>(
    meal?.ingredients.map(ing => ({
      name: ing.name,
      quantity: String(ing.quantity),
      unit: ing.unit,
    })) || [{ name: '', quantity: '', unit: '' }]
  );
  const [errors, setErrors] = useState<string[]>([]);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (
    index: number,
    field: keyof IngredientInput,
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const formData = {
      name: name.trim(),
      ingredients: ingredients
        .filter(ing => ing.name.trim())
        .map(ing => ({
          name: ing.name.trim(),
          quantity: parseFloat(ing.quantity) || 0,
          unit: ing.unit.trim(),
        })),
      notes: notes.trim() || undefined,
    };

    try {
      MealInputSchema.parse(formData);
      onSubmit(formData);
    } catch (err) {
      if (err instanceof ZodError) {
        setErrors(err.errors.map(e => e.message));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          {errors.map((error, i) => (
            <p key={i} className="text-red-600 text-sm">{error}</p>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Meal Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Spaghetti Bolognese"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ingredients
        </label>
        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={index} className="flex gap-2 items-start">
              <input
                type="text"
                value={ing.name}
                onChange={e => updateIngredient(index, 'name', e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingredient name"
              />
              <input
                type="number"
                value={ing.quantity}
                onChange={e => updateIngredient(index, 'quantity', e.target.value)}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Qty"
                min="0"
                step="0.1"
              />
              <input
                type="text"
                value={ing.unit}
                onChange={e => updateIngredient(index, 'unit', e.target.value)}
                className="w-20 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Unit"
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                disabled={ingredients.length === 1}
              >
                X
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          + Add Ingredient
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Any additional notes..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {meal ? 'Update Meal' : 'Create Meal'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
