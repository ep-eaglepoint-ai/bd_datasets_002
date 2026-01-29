# Trajectory

## Task
Build an offline-first meal planner web app using Next.js and TailwindCSS that enables users to create meals, assign them to weekly schedules, and automatically generate consolidated grocery lists without external APIs.

## Implementation

### Core Components

1. **Type Definitions** (`repository_after/src/lib/types.ts`)
   - Ingredient, Meal, PlannedMeal, WeekPlan, GroceryItem, GroceryList interfaces
   - DayOfWeek and MealType type definitions

2. **Zod Schemas** (`repository_after/src/lib/schemas.ts`)
   - IngredientSchema with name/quantity/unit validation
   - MealSchema and MealInputSchema for form validation
   - PlannedMealSchema for weekly planner slots
   - WeekPlanSchema for week management
   - GroceryItemSchema and GroceryListSchema for grocery lists
   - Validation constraints (min 1 char for names, positive quantities)

3. **IndexedDB Database** (`repository_after/src/lib/db.ts`)
   - Uses `idb` library for IndexedDB wrapper
   - CRUD operations: createMeal, updateMeal, deleteMeal, getMeal, getAllMeals
   - Search functionality: searchMeals with name/ingredient filtering
   - Week planning: getOrCreateWeekPlan, assignMealToSlot
   - Grocery generation: generateGroceryList with ingredient merging
   - Data export: exportAllData for backup
   - Cleanup: cleanupOldData for long-term data growth management

4. **Utility Functions** (`repository_after/src/lib/utils.ts`)
   - generateId: UUID generation for entities
   - getWeekStart/getWeekDates: Week calculation helpers
   - addWeeks: Multi-week navigation support
   - normalizeUnit: Unit normalization for ingredient merging
   - exportToJSON/exportToCSV: Export formatters
   - downloadFile: Browser download trigger

### React Components

5. **MealForm** (`repository_after/src/components/MealForm.tsx`)
   - Client component with Zod validation
   - Name, ingredients, and notes input fields
   - Validation error display
   - Submit handler for create/update

6. **MealList** (`repository_after/src/components/MealList.tsx`)
   - Displays all meals with edit/delete actions
   - Integration with search filter

7. **WeeklyPlanner** (`repository_after/src/components/WeeklyPlanner.tsx`)
   - 7-day grid with breakfast/lunch/dinner slots
   - Meal assignment to slots
   - Empty slot handling
   - Multi-week navigation

8. **GroceryList** (`repository_after/src/components/GroceryList.tsx`)
   - Consolidated ingredient list from weekly plan
   - Mark items as purchased
   - Remove items functionality
   - Export to JSON/CSV

9. **SearchFilter** (`repository_after/src/components/SearchFilter.tsx`)
   - Text input for filtering meals
   - onChange handler for real-time filtering

10. **Navigation** (`repository_after/src/components/Navigation.tsx`)
    - App-wide navigation component

### Pages (App Router)

- `app/layout.tsx`: Root layout with navigation
- `app/page.tsx`: Home/dashboard page
- `app/meals/page.tsx`: Meal management page
- `app/planner/page.tsx`: Weekly planner page
- `app/grocery/page.tsx`: Grocery list page

### Key Features
- Offline-first with IndexedDB persistence
- Zod validation for all user inputs
- Ingredient merging by normalized name + unit
- Multi-week navigation (addWeeks utility)
- JSON/CSV export functionality
- Edge case handling (missing meals, empty ingredients, default quantities)
- Data cleanup for long-term storage management

## Tests

78 comprehensive tests covering:
- Schema definitions and validation (Zod)
- TypeScript interface definitions
- Project structure (config files, dependencies)
- Database operations (CRUD, search, week plans)
- Utility functions (ID generation, date handling, export)
- Component existence and functionality
- Edge case handling (missing references, empty data, defaults)
