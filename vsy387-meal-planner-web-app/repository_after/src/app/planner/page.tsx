'use client';

import { useState, useEffect } from 'react';
import { WeekPlan, Meal } from '@/types';
import {
  getOrCreateWeekPlan,
  assignMealToSlot,
  getAllMeals,
  exportAllData,
} from '@/lib/db';
import { getWeekStart, addWeeks, formatDate, downloadFile, exportToJSON, exportToCSV } from '@/lib/utils';
import WeeklyPlanner from '@/components/WeeklyPlanner';

export default function PlannerPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart());
  const [weekPlan, setWeekPlan] = useState<WeekPlan | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plan, allMeals] = await Promise.all([
        getOrCreateWeekPlan(currentWeekStart),
        getAllMeals(),
      ]);
      setWeekPlan(plan);
      setMeals(allMeals);
    } catch (err) {
      console.error('Failed to load planner data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMeal = async (
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    mealId: string | null
  ) => {
    try {
      const updated = await assignMealToSlot(currentWeekStart, date, mealType, mealId);
      setWeekPlan(updated);
    } catch (err) {
      console.error('Failed to assign meal:', err);
      alert('Failed to assign meal');
    }
  };

  const navigateWeek = (direction: number) => {
    setCurrentWeekStart(addWeeks(currentWeekStart, direction));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart());
  };

  const handleExportPlan = (format: 'json' | 'csv') => {
    if (!weekPlan) return;

    const mealMap = new Map(meals.map(m => [m.id, m]));

    if (format === 'json') {
      const data = {
        weekStart: weekPlan.weekStart,
        plannedMeals: weekPlan.plannedMeals.map(pm => ({
          date: pm.date,
          mealType: pm.mealType,
          meal: pm.mealId ? mealMap.get(pm.mealId)?.name || '(Deleted)' : null,
        })),
      };
      const json = exportToJSON(data);
      downloadFile(json, `meal-plan-${weekPlan.weekStart}.json`, 'application/json');
    } else {
      const rows = weekPlan.plannedMeals
        .filter(pm => pm.mealId)
        .map(pm => ({
          date: pm.date,
          mealType: pm.mealType,
          meal: pm.mealId ? mealMap.get(pm.mealId)?.name || '(Deleted)' : '',
        }));
      const csv = exportToCSV(rows, ['date', 'mealType', 'meal']);
      downloadFile(csv, `meal-plan-${weekPlan.weekStart}.csv`, 'text/csv');
    }
  };

  const weekStartDate = new Date(currentWeekStart);
  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Weekly Planner</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportPlan('json')}
            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExportPlan('csv')}
            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <button
          onClick={() => navigateWeek(-1)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Previous Week
        </button>

        <div className="text-center">
          <div className="font-medium text-gray-900">
            {formatDate(currentWeekStart)} - {formatDate(weekEndDate.toISOString().split('T')[0])}
          </div>
          {currentWeekStart !== getWeekStart() && (
            <button
              onClick={goToCurrentWeek}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Go to current week
            </button>
          )}
        </div>

        <button
          onClick={() => navigateWeek(1)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Next Week
        </button>
      </div>

      {/* Planner Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading planner...</div>
        </div>
      ) : weekPlan ? (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <WeeklyPlanner
            weekPlan={weekPlan}
            meals={meals}
            onAssignMeal={handleAssignMeal}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Failed to load week plan
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          Click on any cell to assign a meal. Create meals first in the Meals section.
        </p>
      </div>
    </div>
  );
}
