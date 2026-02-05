/**
 * Test suite for Meal Planner Web App structure and configuration.
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = path.join(__dirname, '..', 'repository_after');

describe('Project Structure', () => {
  describe('Configuration Files', () => {
    test('package.json exists', () => {
      const filePath = path.join(BASE_DIR, 'package.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('package.json is valid with required dependencies', () => {
      const filePath = path.join(BASE_DIR, 'package.json');
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      expect(content.name).toBeDefined();
      expect(content.dependencies).toBeDefined();
      expect(content.dependencies.next).toBeDefined();
      expect(content.dependencies.react).toBeDefined();
      expect(content.dependencies.zod).toBeDefined();
      expect(content.dependencies.idb).toBeDefined();
    });

    test('tsconfig.json exists', () => {
      const filePath = path.join(BASE_DIR, 'tsconfig.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('tailwind.config.js exists', () => {
      const filePath = path.join(BASE_DIR, 'tailwind.config.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('next.config.js exists', () => {
      const filePath = path.join(BASE_DIR, 'next.config.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Source Files', () => {
    test('types file exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'types', 'index.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('schemas file exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'lib', 'schemas.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('database module exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'lib', 'db.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('utils module exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'lib', 'utils.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('app layout exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'app', 'layout.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('home page exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'app', 'page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('meals page exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'app', 'meals', 'page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('planner page exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'app', 'planner', 'page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('grocery page exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'app', 'grocery', 'page.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Components', () => {
    test('MealForm component exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'components', 'MealForm.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('MealList component exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'components', 'MealList.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('WeeklyPlanner component exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'components', 'WeeklyPlanner.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('GroceryList component exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'components', 'GroceryList.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('SearchFilter component exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'components', 'SearchFilter.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('Navigation component exists', () => {
      const filePath = path.join(BASE_DIR, 'src', 'components', 'Navigation.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
