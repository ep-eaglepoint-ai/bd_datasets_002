'use client';

import { useState } from 'react';
import { WeekPlan, Meal, PlannedMeal } from '@/types';
import { formatDate, getWeekDates } from '@/lib/utils';

interface WeeklyPlannerProps {
  weekPlan: WeekPlan;
  meals: Meal[];
  onAssignMeal: (
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    mealId: string | null
  ) => void;
}

const MEAL_TYPES: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

export default function WeeklyPlanner({
  weekPlan,
  meals,
  onAssignMeal,
}: WeeklyPlannerProps) {
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  } | null>(null);

  const weekDates = getWeekDates(weekPlan.weekStart);
  const mealMap = new Map(meals.map(m => [m.id, m]));

  const getPlannedMeal = (
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): PlannedMeal | undefined => {
    return weekPlan.plannedMeals.find(
      pm => pm.date === date && pm.mealType === mealType
    );
  };

  const getMealName = (mealId: string | null): string => {
    if (!mealId) return '';
    const meal = mealMap.get(mealId);
    return meal?.name || '(Deleted meal)';
  };

  const handleSlotClick = (
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ) => {
    setSelectedSlot({ date, mealType });
  };

  const handleMealSelect = (mealId: string | null) => {
    if (selectedSlot) {
      onAssignMeal(selectedSlot.date, selectedSlot.mealType, mealId);
      setSelectedSlot(null);
    }
  };

  return (
    <div className="relative">
      {/* Week Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2 bg-gray-50 w-24"></th>
              {weekDates.map(date => (
                <th
                  key={date}
                  className="border border-gray-200 p-2 bg-gray-50 text-sm font-medium"
                >
                  {formatDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPES.map(mealType => (
              <tr key={mealType}>
                <td className="border border-gray-200 p-2 bg-gray-50 text-sm font-medium capitalize">
                  {mealType}
                </td>
                {weekDates.map(date => {
                  const planned = getPlannedMeal(date, mealType);
                  const mealName = getMealName(planned?.mealId || null);
                  const isSelected =
                    selectedSlot?.date === date &&
                    selectedSlot?.mealType === mealType;

                  return (
                    <td
                      key={`${date}-${mealType}`}
                      className={`border border-gray-200 p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                        isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleSlotClick(date, mealType)}
                    >
                      {mealName ? (
                        <span className="text-sm text-gray-800">{mealName}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">
                          Click to add
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Meal Selection Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">
              Select meal for {formatDate(selectedSlot.date)} -{' '}
              <span className="capitalize">{selectedSlot.mealType}</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => handleMealSelect(null)}
                className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50"
              >
                <span className="text-gray-500 italic">Clear slot</span>
              </button>

              {meals.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No meals created yet. Create some meals first!
                </p>
              ) : (
                meals.map(meal => (
                  <button
                    key={meal.id}
                    onClick={() => handleMealSelect(meal.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300"
                  >
                    <span className="font-medium">{meal.name}</span>
                    {meal.ingredients.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        {meal.ingredients
                          .slice(0, 3)
                          .map(i => i.name)
                          .join(', ')}
                        {meal.ingredients.length > 3 && '...'}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedSlot(null)}
              className="mt-4 w-full py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
