// Barrel export for all library modules
// Note: Individual modules should be imported directly to avoid naming conflicts
export * from './types';

// Re-export db module with namespace
import * as db from './db';
export { db };

// Re-export store
export { useGoalStore } from './store';

// Re-export analytics with namespace to avoid conflicts with db
import * as analytics from './analytics';
export { analytics };

// Re-export dependencies with namespace
import * as dependencies from './dependencies';
export { dependencies };

// Re-export export utilities with namespace
import * as exportUtils from './export';
export { exportUtils };
