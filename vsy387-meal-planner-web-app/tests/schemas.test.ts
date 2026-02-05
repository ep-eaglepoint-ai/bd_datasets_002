/**
 * Test suite for Zod schema definitions and validation logic.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = path.join(__dirname, '..', 'repository_after');

describe('Schema Definitions', () => {
  let schemaContent: string;
  let typesContent: string;

  beforeAll(() => {
    schemaContent = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'lib', 'schemas.ts'),
      'utf-8'
    );
    typesContent = fs.readFileSync(
      path.join(BASE_DIR, 'src', 'types', 'index.ts'),
      'utf-8'
    );
  });

  describe('Zod Schemas', () => {
    test('imports zod', () => {
      expect(
        schemaContent.includes("from 'zod'") || schemaContent.includes('from "zod"')
      ).toBe(true);
    });

    test('IngredientSchema is defined', () => {
      expect(schemaContent).toContain('IngredientSchema');
    });

    test('MealSchema is defined', () => {
      expect(schemaContent).toContain('MealSchema');
    });

    test('MealInputSchema is defined for validation', () => {
      expect(schemaContent).toContain('MealInputSchema');
    });

    test('PlannedMealSchema is defined', () => {
      expect(schemaContent).toContain('PlannedMealSchema');
    });

    test('WeekPlanSchema is defined', () => {
      expect(schemaContent).toContain('WeekPlanSchema');
    });

    test('GroceryItemSchema is defined', () => {
      expect(schemaContent).toContain('GroceryItemSchema');
    });

    test('GroceryListSchema is defined', () => {
      expect(schemaContent).toContain('GroceryListSchema');
    });

    test('meal name has validation', () => {
      expect(schemaContent).toContain('min(1');
    });

    test('quantity has validation', () => {
      expect(schemaContent).toContain('min(0');
    });
  });

  describe('Type Definitions', () => {
    test('Ingredient interface is defined', () => {
      expect(
        typesContent.includes('interface Ingredient') ||
          typesContent.includes('type Ingredient')
      ).toBe(true);
    });

    test('Meal interface is defined', () => {
      expect(
        typesContent.includes('interface Meal') || typesContent.includes('type Meal')
      ).toBe(true);
    });

    test('WeekPlan interface is defined', () => {
      expect(
        typesContent.includes('interface WeekPlan') ||
          typesContent.includes('type WeekPlan')
      ).toBe(true);
    });

    test('GroceryItem interface is defined', () => {
      expect(
        typesContent.includes('interface GroceryItem') ||
          typesContent.includes('type GroceryItem')
      ).toBe(true);
    });

    test('GroceryList interface is defined', () => {
      expect(
        typesContent.includes('interface GroceryList') ||
          typesContent.includes('type GroceryList')
      ).toBe(true);
    });

    test('Meal has name field', () => {
      expect(typesContent).toContain('name:');
      expect(typesContent).toContain('string');
    });

    test('Meal has ingredients field', () => {
      expect(typesContent).toContain('ingredients:');
    });

    test('GroceryItem has purchased field', () => {
      expect(typesContent).toContain('purchased:');
      expect(typesContent).toContain('boolean');
    });
  });
});
