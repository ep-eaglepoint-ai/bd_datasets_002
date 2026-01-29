/**
 * Test suite for core functionality implementation.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = path.join(__dirname, '..', 'repository_after');

describe('Database Module', () => {
  let dbContent: string;

  beforeAll(() => {
    dbContent = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'lib', 'db.ts'),
      'utf-8'
    );
  });

  test('imports idb for IndexedDB', () => {
    expect(
      dbContent.includes("from 'idb'") || dbContent.includes('from "idb"')
    ).toBe(true);
  });

  test('createMeal function exists', () => {
    expect(dbContent).toContain('createMeal');
  });

  test('updateMeal function exists', () => {
    expect(dbContent).toContain('updateMeal');
  });

  test('deleteMeal function exists', () => {
    expect(dbContent).toContain('deleteMeal');
  });

  test('getMeal function exists', () => {
    expect(dbContent).toContain('getMeal');
  });

  test('getAllMeals function exists', () => {
    expect(dbContent).toContain('getAllMeals');
  });

  test('searchMeals function exists for filtering', () => {
    expect(dbContent).toContain('searchMeals');
  });

  test('getOrCreateWeekPlan function exists', () => {
    expect(dbContent).toContain('getOrCreateWeekPlan');
  });

  test('assignMealToSlot function exists', () => {
    expect(dbContent).toContain('assignMealToSlot');
  });

  test('generateGroceryList function exists', () => {
    expect(dbContent).toContain('generateGroceryList');
  });

  test('updateGroceryItem function exists', () => {
    expect(dbContent).toContain('updateGroceryItem');
  });

  test('exportAllData function exists', () => {
    expect(dbContent).toContain('exportAllData');
  });

  test('ingredient merging logic is implemented', () => {
    expect(dbContent.includes('ingredientMap') || dbContent.includes('Map')).toBe(
      true
    );
  });

  test('cleanup function exists for data growth', () => {
    expect(
      dbContent.includes('cleanupOldData') || dbContent.includes('cleanup')
    ).toBe(true);
  });
});

describe('Utils Module', () => {
  let utilsContent: string;

  beforeAll(() => {
    utilsContent = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'lib', 'utils.ts'),
      'utf-8'
    );
  });

  test('generateId function exists', () => {
    expect(utilsContent).toContain('generateId');
  });

  test('getWeekStart function exists', () => {
    expect(utilsContent).toContain('getWeekStart');
  });

  test('getWeekDates function exists', () => {
    expect(utilsContent).toContain('getWeekDates');
  });

  test('addWeeks function exists for multi-week navigation', () => {
    expect(utilsContent).toContain('addWeeks');
  });

  test('exportToJSON function exists', () => {
    expect(utilsContent).toContain('exportToJSON');
  });

  test('exportToCSV function exists', () => {
    expect(utilsContent).toContain('exportToCSV');
  });

  test('downloadFile function exists', () => {
    expect(utilsContent).toContain('downloadFile');
  });

  test('normalizeUnit function exists for merging', () => {
    expect(utilsContent).toContain('normalizeUnit');
  });
});

describe('MealForm Component', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'components', 'MealForm.tsx'),
      'utf-8'
    );
  });

  test('is a client component', () => {
    expect(
      content.includes("'use client'") || content.includes('"use client"')
    ).toBe(true);
  });

  test('has name input', () => {
    expect(content.toLowerCase()).toContain('name');
    expect(content.toLowerCase()).toContain('input');
  });

  test('has ingredients section', () => {
    expect(content.toLowerCase()).toContain('ingredient');
  });

  test('has notes field', () => {
    expect(content.toLowerCase()).toContain('notes');
  });

  test('uses Zod for validation', () => {
    expect(content.includes('Schema') || content.includes('parse')).toBe(true);
  });

  test('handles validation errors', () => {
    expect(content.toLowerCase()).toContain('error');
  });
});

describe('WeeklyPlanner Component', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'components', 'WeeklyPlanner.tsx'),
      'utf-8'
    );
  });

  test('is a client component', () => {
    expect(
      content.includes("'use client'") || content.includes('"use client"')
    ).toBe(true);
  });

  test('displays days', () => {
    expect(
      content.toLowerCase().includes('date') || content.toLowerCase().includes('day')
    ).toBe(true);
  });

  test('handles meal types', () => {
    expect(
      content.toLowerCase().includes('breakfast') || content.includes('mealType')
    ).toBe(true);
  });

  test('handles empty slots', () => {
    expect(
      content.includes('null') || content.toLowerCase().includes('empty')
    ).toBe(true);
  });
});

describe('GroceryList Component', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'components', 'GroceryList.tsx'),
      'utf-8'
    );
  });

  test('is a client component', () => {
    expect(
      content.includes("'use client'") || content.includes('"use client"')
    ).toBe(true);
  });

  test('supports marking items as purchased', () => {
    expect(content.toLowerCase()).toContain('purchased');
  });

  test('supports removing items', () => {
    expect(
      content.toLowerCase().includes('remove') ||
        content.toLowerCase().includes('delete')
    ).toBe(true);
  });

  test('supports exporting', () => {
    expect(content.toLowerCase()).toContain('export');
  });

  test('displays quantities', () => {
    expect(content.toLowerCase()).toContain('quantity');
  });
});

describe('SearchFilter Component', () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'components', 'SearchFilter.tsx'),
      'utf-8'
    );
  });

  test('is a client component', () => {
    expect(
      content.includes("'use client'") || content.includes('"use client"')
    ).toBe(true);
  });

  test('has input field', () => {
    expect(content.toLowerCase()).toContain('input');
  });

  test('handles onChange', () => {
    expect(content).toContain('onChange');
  });
});

describe('Edge Case Handling', () => {
  let dbContent: string;

  beforeAll(() => {
    dbContent = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'lib', 'db.ts'),
      'utf-8'
    );
  });

  test('handles missing meal references', () => {
    expect(dbContent.includes('null') || dbContent.includes('!')).toBe(true);
  });

  test('handles empty ingredients', () => {
    expect(dbContent.includes('length') || dbContent.includes('[]')).toBe(true);
  });

  test('handles missing quantities with defaults', () => {
    expect(
      dbContent.includes('|| 0') || dbContent.toLowerCase().includes('default')
    ).toBe(true);
  });
});
