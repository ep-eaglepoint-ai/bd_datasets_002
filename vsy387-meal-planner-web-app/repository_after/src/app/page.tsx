'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllMeals, getAllWeekPlans, exportAllData } from '@/lib/db';
import { downloadFile, exportToJSON } from '@/lib/utils';

export default function Home() {
  const [stats, setStats] = useState({ meals: 0, plans: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const meals = await getAllMeals();
      const plans = await getAllWeekPlans();
      setStats({ meals: meals.length, plans: plans.length });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const data = await exportAllData();
      const json = exportToJSON(data);
      downloadFile(json, `meal-planner-export-${Date.now()}.json`, 'application/json');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data');
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meal Planner</h1>
        <p className="text-gray-600">
          Plan your meals, organize weekly schedules, and generate grocery lists
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {loading ? '-' : stats.meals}
          </div>
          <div className="text-gray-600">Meals Created</div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <div className="text-3xl font-bold text-green-600">
            {loading ? '-' : stats.plans}
          </div>
          <div className="text-gray-600">Week Plans</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/meals"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-2">Manage Meals</h2>
          <p className="text-gray-600 text-sm">
            Create and organize your favorite meals with ingredients
          </p>
        </Link>

        <Link
          href="/planner"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-2">Weekly Planner</h2>
          <p className="text-gray-600 text-sm">
            Assign meals to days and plan your weekly menu
          </p>
        </Link>

        <Link
          href="/grocery"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-2">Grocery List</h2>
          <p className="text-gray-600 text-sm">
            Generate shopping lists from your meal plans
          </p>
        </Link>
      </div>

      {/* Export Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Export Data</h2>
        <p className="text-gray-600 text-sm mb-4">
          Download all your meals, plans, and grocery lists as a JSON file
        </p>
        <button
          onClick={handleExportAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Export All Data
        </button>
      </div>

      {/* Offline Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 text-sm">
          This app works entirely offline. All data is stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
