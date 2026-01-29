import { z } from 'zod';

export const IngredientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Ingredient name is required'),
  quantity: z.number().min(0, 'Quantity must be non-negative').default(0),
  unit: z.string().default(''),
});

export const MealSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Meal name is required').max(100, 'Meal name too long'),
  ingredients: z.array(IngredientSchema).default([]),
  notes: z.string().max(500, 'Notes too long').optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MealInputSchema = z.object({
  name: z.string().min(1, 'Meal name is required').max(100, 'Meal name too long'),
  ingredients: z.array(z.object({
    name: z.string().min(1, 'Ingredient name is required'),
    quantity: z.number().min(0, 'Quantity must be non-negative').default(0),
    unit: z.string().default(''),
  })).default([]),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const PlannedMealSchema = z.object({
  id: z.string().min(1),
  mealId: z.string().nullable(),
  date: z.string(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

export const WeekPlanSchema = z.object({
  id: z.string().min(1),
  weekStart: z.string(),
  plannedMeals: z.array(PlannedMealSchema),
});

export const GroceryItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string(),
  purchased: z.boolean(),
  mealIds: z.array(z.string()),
});

export const GroceryListSchema = z.object({
  id: z.string().min(1),
  weekStart: z.string(),
  items: z.array(GroceryItemSchema),
  createdAt: z.string(),
});

export type IngredientInput = z.infer<typeof IngredientSchema>;
export type MealInput = z.infer<typeof MealInputSchema>;
export type PlannedMealInput = z.infer<typeof PlannedMealSchema>;
export type WeekPlanInput = z.infer<typeof WeekPlanSchema>;
export type GroceryItemInput = z.infer<typeof GroceryItemSchema>;
export type GroceryListInput = z.infer<typeof GroceryListSchema>;
