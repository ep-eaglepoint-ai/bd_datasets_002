import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Meal, WeekPlan, GroceryList, GroceryItem, Ingredient } from '@/types';
import { MealSchema, WeekPlanSchema, GroceryListSchema } from './schemas';
import { generateId, normalizeUnit, canMergeUnits } from './utils';

interface MealPlannerDB extends DBSchema {
  meals: {
    key: string;
    value: Meal;
    indexes: { 'by-name': string; 'by-created': string };
  };
  weekPlans: {
    key: string;
    value: WeekPlan;
    indexes: { 'by-weekStart': string };
  };
  groceryLists: {
    key: string;
    value: GroceryList;
    indexes: { 'by-weekStart': string };
  };
}

const DB_NAME = 'meal-planner-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MealPlannerDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MealPlannerDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MealPlannerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Meals store
      if (!db.objectStoreNames.contains('meals')) {
        const mealStore = db.createObjectStore('meals', { keyPath: 'id' });
        mealStore.createIndex('by-name', 'name');
        mealStore.createIndex('by-created', 'createdAt');
      }

      // Week plans store
      if (!db.objectStoreNames.contains('weekPlans')) {
        const planStore = db.createObjectStore('weekPlans', { keyPath: 'id' });
        planStore.createIndex('by-weekStart', 'weekStart');
      }

      // Grocery lists store
      if (!db.objectStoreNames.contains('groceryLists')) {
        const groceryStore = db.createObjectStore('groceryLists', { keyPath: 'id' });
        groceryStore.createIndex('by-weekStart', 'weekStart');
      }
    },
  });

  return dbInstance;
}

// Meal operations
export async function createMeal(input: {
  name: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  notes?: string;
}): Promise<Meal> {
  const db = await getDB();
  const now = new Date().toISOString();

  const meal: Meal = {
    id: generateId(),
    name: input.name.trim(),
    ingredients: input.ingredients.map(ing => ({
      id: generateId(),
      name: ing.name.trim(),
      quantity: ing.quantity || 0,
      unit: ing.unit || '',
    })),
    notes: input.notes?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const validated = MealSchema.parse(meal);
  await db.put('meals', validated);
  return validated;
}

export async function updateMeal(
  id: string,
  input: {
    name?: string;
    ingredients?: Array<{ name: string; quantity: number; unit: string }>;
    notes?: string;
  }
): Promise<Meal | null> {
  const db = await getDB();
  const existing = await db.get('meals', id);
  if (!existing) return null;

  const updated: Meal = {
    ...existing,
    name: input.name?.trim() ?? existing.name,
    ingredients: input.ingredients
      ? input.ingredients.map(ing => ({
          id: generateId(),
          name: ing.name.trim(),
          quantity: ing.quantity || 0,
          unit: ing.unit || '',
        }))
      : existing.ingredients,
    notes: input.notes !== undefined ? input.notes?.trim() : existing.notes,
    updatedAt: new Date().toISOString(),
  };

  const validated = MealSchema.parse(updated);
  await db.put('meals', validated);
  return validated;
}

export async function deleteMeal(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('meals', id);
  if (!existing) return false;

  await db.delete('meals', id);
  return true;
}

export async function getMeal(id: string): Promise<Meal | null> {
  const db = await getDB();
  const meal = await db.get('meals', id);
  return meal || null;
}

export async function getAllMeals(): Promise<Meal[]> {
  const db = await getDB();
  return db.getAll('meals');
}

export async function searchMeals(query: string): Promise<Meal[]> {
  const db = await getDB();
  const allMeals = await db.getAll('meals');
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) return allMeals;

  return allMeals.filter(meal => {
    const nameMatch = meal.name.toLowerCase().includes(lowerQuery);
    const ingredientMatch = meal.ingredients.some(ing =>
      ing.name.toLowerCase().includes(lowerQuery)
    );
    return nameMatch || ingredientMatch;
  });
}

// Week plan operations
export async function getOrCreateWeekPlan(weekStart: string): Promise<WeekPlan> {
  const db = await getDB();
  const existing = await db.getFromIndex('weekPlans', 'by-weekStart', weekStart);

  if (existing) return existing;

  const mealTypes: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'> = [
    'breakfast',
    'lunch',
    'dinner',
    'snack',
  ];
  const days = 7;
  const plannedMeals = [];

  const startDate = new Date(weekStart);
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    for (const mealType of mealTypes) {
      plannedMeals.push({
        id: generateId(),
        mealId: null,
        date: dateStr,
        mealType,
      });
    }
  }

  const weekPlan: WeekPlan = {
    id: generateId(),
    weekStart,
    plannedMeals,
  };

  const validated = WeekPlanSchema.parse(weekPlan);
  await db.put('weekPlans', validated);
  return validated;
}

export async function updateWeekPlan(weekPlan: WeekPlan): Promise<WeekPlan> {
  const db = await getDB();
  const validated = WeekPlanSchema.parse(weekPlan);
  await db.put('weekPlans', validated);
  return validated;
}

export async function assignMealToSlot(
  weekStart: string,
  date: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  mealId: string | null
): Promise<WeekPlan> {
  const weekPlan = await getOrCreateWeekPlan(weekStart);

  const updatedPlannedMeals = weekPlan.plannedMeals.map(pm => {
    if (pm.date === date && pm.mealType === mealType) {
      return { ...pm, mealId };
    }
    return pm;
  });

  const updated: WeekPlan = {
    ...weekPlan,
    plannedMeals: updatedPlannedMeals,
  };

  return updateWeekPlan(updated);
}

export async function getAllWeekPlans(): Promise<WeekPlan[]> {
  const db = await getDB();
  return db.getAll('weekPlans');
}

// Grocery list operations
export async function generateGroceryList(weekStart: string): Promise<GroceryList> {
  const db = await getDB();
  const weekPlan = await getOrCreateWeekPlan(weekStart);
  const meals = await getAllMeals();
  const mealMap = new Map(meals.map(m => [m.id, m]));

  const ingredientMap = new Map<string, GroceryItem>();

  for (const plannedMeal of weekPlan.plannedMeals) {
    if (!plannedMeal.mealId) continue;

    const meal = mealMap.get(plannedMeal.mealId);
    if (!meal) continue;

    for (const ingredient of meal.ingredients) {
      const normalizedUnit = normalizeUnit(ingredient.unit);
      const key = `${ingredient.name.toLowerCase()}-${normalizedUnit}`;

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!;
        existing.quantity += ingredient.quantity;
        if (!existing.mealIds.includes(meal.id)) {
          existing.mealIds.push(meal.id);
        }
      } else {
        ingredientMap.set(key, {
          id: generateId(),
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: normalizedUnit,
          purchased: false,
          mealIds: [meal.id],
        });
      }
    }
  }

  const groceryList: GroceryList = {
    id: generateId(),
    weekStart,
    items: Array.from(ingredientMap.values()),
    createdAt: new Date().toISOString(),
  };

  const validated = GroceryListSchema.parse(groceryList);

  // Remove existing grocery list for this week
  const existingList = await db.getFromIndex('groceryLists', 'by-weekStart', weekStart);
  if (existingList) {
    await db.delete('groceryLists', existingList.id);
  }

  await db.put('groceryLists', validated);
  return validated;
}

export async function getGroceryList(weekStart: string): Promise<GroceryList | null> {
  const db = await getDB();
  const list = await db.getFromIndex('groceryLists', 'by-weekStart', weekStart);
  return list || null;
}

export async function updateGroceryItem(
  weekStart: string,
  itemId: string,
  updates: { purchased?: boolean; quantity?: number; removed?: boolean }
): Promise<GroceryList | null> {
  const db = await getDB();
  const groceryList = await db.getFromIndex('groceryLists', 'by-weekStart', weekStart);

  if (!groceryList) return null;

  let updatedItems = groceryList.items;

  if (updates.removed) {
    updatedItems = updatedItems.filter(item => item.id !== itemId);
  } else {
    updatedItems = updatedItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          purchased: updates.purchased ?? item.purchased,
          quantity: updates.quantity ?? item.quantity,
        };
      }
      return item;
    });
  }

  const updated: GroceryList = {
    ...groceryList,
    items: updatedItems,
  };

  const validated = GroceryListSchema.parse(updated);
  await db.put('groceryLists', validated);
  return validated;
}

export async function getAllGroceryLists(): Promise<GroceryList[]> {
  const db = await getDB();
  return db.getAll('groceryLists');
}

// Export operations
export async function exportAllData(): Promise<{
  meals: Meal[];
  weekPlans: WeekPlan[];
  groceryLists: GroceryList[];
  exportedAt: string;
}> {
  const meals = await getAllMeals();
  const weekPlans = await getAllWeekPlans();
  const groceryLists = await getAllGroceryLists();

  return {
    meals,
    weekPlans,
    groceryLists,
    exportedAt: new Date().toISOString(),
  };
}

// Cleanup for long-term data growth
export async function cleanupOldData(keepWeeks: number = 12): Promise<void> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepWeeks * 7);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const weekPlans = await db.getAll('weekPlans');
  const groceryLists = await db.getAll('groceryLists');

  for (const plan of weekPlans) {
    if (plan.weekStart < cutoffStr) {
      await db.delete('weekPlans', plan.id);
    }
  }

  for (const list of groceryLists) {
    if (list.weekStart < cutoffStr) {
      await db.delete('groceryLists', list.id);
    }
  }
}
