export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Meal {
  id: string;
  name: string;
  ingredients: Ingredient[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedMeal {
  id: string;
  mealId: string | null;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface WeekPlan {
  id: string;
  weekStart: string;
  plannedMeals: PlannedMeal[];
}

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  mealIds: string[];
}

export interface GroceryList {
  id: string;
  weekStart: string;
  items: GroceryItem[];
  createdAt: string;
}

export type ExportFormat = 'json' | 'csv';

export interface ExportData {
  meals: Meal[];
  weekPlans: WeekPlan[];
  groceryLists: GroceryList[];
  exportedAt: string;
}
