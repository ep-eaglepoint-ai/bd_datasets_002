'use client';

import { useState, useEffect } from 'react';
import { Meal } from '@/types';
import { getAllMeals, createMeal, updateMeal, deleteMeal, searchMeals } from '@/lib/db';
import MealForm from '@/components/MealForm';
import MealList from '@/components/MealList';
import SearchFilter from '@/components/SearchFilter';

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMeals();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery);
    } else {
      loadMeals();
    }
  }, [searchQuery]);

  const loadMeals = async () => {
    try {
      const data = await getAllMeals();
      setMeals(data);
    } catch (err) {
      console.error('Failed to load meals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    try {
      const results = await searchMeals(query);
      setMeals(results);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleCreate = async (data: {
    name: string;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    notes?: string;
  }) => {
    try {
      await createMeal(data);
      setShowForm(false);
      loadMeals();
    } catch (err) {
      console.error('Failed to create meal:', err);
      alert('Failed to create meal');
    }
  };

  const handleUpdate = async (data: {
    name: string;
    ingredients: Array<{ name: string; quantity: number; unit: string }>;
    notes?: string;
  }) => {
    if (!editingMeal) return;

    try {
      await updateMeal(editingMeal.id, data);
      setEditingMeal(null);
      loadMeals();
    } catch (err) {
      console.error('Failed to update meal:', err);
      alert('Failed to update meal');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMeal(id);
      loadMeals();
    } catch (err) {
      console.error('Failed to delete meal:', err);
      alert('Failed to delete meal');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">Loading meals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Meals</h1>
        {!showForm && !editingMeal && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + New Meal
          </button>
        )}
      </div>

      {/* Search */}
      {!showForm && !editingMeal && (
        <SearchFilter
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by meal name or ingredient..."
        />
      )}

      {/* Form */}
      {(showForm || editingMeal) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium mb-4">
            {editingMeal ? 'Edit Meal' : 'Create New Meal'}
          </h2>
          <MealForm
            meal={editingMeal || undefined}
            onSubmit={editingMeal ? handleUpdate : handleCreate}
            onCancel={() => {
              setShowForm(false);
              setEditingMeal(null);
            }}
          />
        </div>
      )}

      {/* List */}
      {!showForm && !editingMeal && (
        <MealList
          meals={meals}
          onEdit={setEditingMeal}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
