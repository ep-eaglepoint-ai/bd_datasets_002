'use client';

import { useState, useEffect } from 'react';
import { GroceryList as GroceryListType } from '@/types';
import {
  generateGroceryList,
  getGroceryList,
  updateGroceryItem,
} from '@/lib/db';
import { getWeekStart, addWeeks, formatDate, downloadFile, exportToJSON, exportToCSV } from '@/lib/utils';
import GroceryList from '@/components/GroceryList';

export default function GroceryPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart());
  const [groceryList, setGroceryList] = useState<GroceryListType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroceryList();
  }, [currentWeekStart]);

  const loadGroceryList = async () => {
    setLoading(true);
    try {
      const list = await getGroceryList(currentWeekStart);
      setGroceryList(list);
    } catch (err) {
      console.error('Failed to load grocery list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const list = await generateGroceryList(currentWeekStart);
      setGroceryList(list);
    } catch (err) {
      console.error('Failed to generate grocery list:', err);
      alert('Failed to generate grocery list');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePurchased = async (itemId: string, purchased: boolean) => {
    try {
      const updated = await updateGroceryItem(currentWeekStart, itemId, { purchased });
      setGroceryList(updated);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const updated = await updateGroceryItem(currentWeekStart, itemId, { removed: true });
      setGroceryList(updated);
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (!groceryList) return;

    if (format === 'json') {
      const json = exportToJSON({
        weekStart: groceryList.weekStart,
        items: groceryList.items,
        createdAt: groceryList.createdAt,
      });
      downloadFile(json, `grocery-list-${groceryList.weekStart}.json`, 'application/json');
    } else {
      const rows = groceryList.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        purchased: item.purchased ? 'Yes' : 'No',
      }));
      const csv = exportToCSV(rows, ['name', 'quantity', 'unit', 'purchased']);
      downloadFile(csv, `grocery-list-${groceryList.weekStart}.csv`, 'text/csv');
    }
  };

  const navigateWeek = (direction: number) => {
    setCurrentWeekStart(addWeeks(currentWeekStart, direction));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart());
  };

  const weekStartDate = new Date(currentWeekStart);
  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Grocery List</h1>
        <button
          onClick={handleGenerate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={loading}
        >
          {groceryList ? 'Regenerate List' : 'Generate List'}
        </button>
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

      {/* Grocery List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <GroceryList
            groceryList={groceryList}
            onTogglePurchased={handleTogglePurchased}
            onRemoveItem={handleRemoveItem}
            onExport={handleExport}
          />
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          The grocery list is generated from your meal plan. Make sure to plan your meals first,
          then generate the list. Items are automatically merged and quantities summed.
        </p>
      </div>
    </div>
  );
}
