'use client';

import { Meal } from '@/types';

interface MealListProps {
  meals: Meal[];
  onEdit: (meal: Meal) => void;
  onDelete: (id: string) => void;
  onSelect?: (meal: Meal) => void;
  selectable?: boolean;
}

export default function MealList({
  meals,
  onEdit,
  onDelete,
  onSelect,
  selectable = false,
}: MealListProps) {
  if (meals.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No meals found. Create your first meal to get started!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meals.map(meal => (
        <div
          key={meal.id}
          className={`border border-gray-200 rounded-lg p-4 ${
            selectable ? 'cursor-pointer hover:border-blue-400' : ''
          }`}
          onClick={() => selectable && onSelect?.(meal)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{meal.name}</h3>
              {meal.ingredients.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {meal.ingredients.map(ing => ing.name).join(', ')}
                </p>
              )}
              {meal.notes && (
                <p className="text-sm text-gray-400 mt-1 italic">{meal.notes}</p>
              )}
            </div>
            {!selectable && (
              <div className="flex gap-2 ml-4">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(meal);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (confirm('Delete this meal?')) {
                      onDelete(meal.id);
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
