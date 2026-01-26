// Export Utilities for Goal Tracking Application
// Supports JSON and CSV export with full data integrity

import {
  Goal,
  Milestone,
  ProgressUpdate,
  Dependency,
  DecisionRecord,
  VersionSnapshot,
  ExportConfig,
} from './types';
import { ExportData } from './db';

// ============================================================================
// JSON Export
// ============================================================================

/**
 * Exports data as a formatted JSON string
 */
export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Creates a downloadable JSON file
 */
export function downloadJSON(data: ExportData, filename: string = 'goal-tracking-export'): void {
  const jsonString = exportToJSON(data);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

// ============================================================================
// CSV Export
// ============================================================================

interface CSVColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Escape quotes and wrap in quotes if contains special characters
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

function toCSV<T>(items: T[], columns: CSVColumn<T>[]): string {
  const headers = columns.map(c => escapeCSV(c.header)).join(',');
  
  const rows = items.map(item => 
    columns.map(col => escapeCSV(col.accessor(item))).join(',')
  );
  
  return [headers, ...rows].join('\n');
}

// Goal columns
const goalColumns: CSVColumn<Goal>[] = [
  { header: 'ID', accessor: g => g.id },
  { header: 'Title', accessor: g => g.title },
  { header: 'Description', accessor: g => g.description || '' },
  { header: 'Priority', accessor: g => g.priority },
  { header: 'Priority Weight', accessor: g => g.priorityWeight },
  { header: 'State', accessor: g => g.state },
  { header: 'Progress', accessor: g => g.progress },
  { header: 'Start Date', accessor: g => g.startDate || '' },
  { header: 'Target Date', accessor: g => g.targetDate || '' },
  { header: 'Completed At', accessor: g => g.completedAt || '' },
  { header: 'Success Criteria', accessor: g => g.successCriteria.join('; ') },
  { header: 'Motivation Notes', accessor: g => g.motivationNotes || '' },
  { header: 'Tags', accessor: g => g.tags.join('; ') },
  { header: 'Created At', accessor: g => g.createdAt },
  { header: 'Updated At', accessor: g => g.updatedAt },
];

// Milestone columns
const milestoneColumns: CSVColumn<Milestone>[] = [
  { header: 'ID', accessor: m => m.id },
  { header: 'Goal ID', accessor: m => m.goalId },
  { header: 'Parent Milestone ID', accessor: m => m.parentMilestoneId || '' },
  { header: 'Title', accessor: m => m.title },
  { header: 'Description', accessor: m => m.description || '' },
  { header: 'Priority', accessor: m => m.priority },
  { header: 'State', accessor: m => m.state },
  { header: 'Progress', accessor: m => m.progress },
  { header: 'Order', accessor: m => m.order },
  { header: 'Target Date', accessor: m => m.targetDate || '' },
  { header: 'Completed At', accessor: m => m.completedAt || '' },
  { header: 'Created At', accessor: m => m.createdAt },
  { header: 'Updated At', accessor: m => m.updatedAt },
];

// Progress update columns
const progressUpdateColumns: CSVColumn<ProgressUpdate>[] = [
  { header: 'ID', accessor: p => p.id },
  { header: 'Entity ID', accessor: p => p.entityId },
  { header: 'Entity Type', accessor: p => p.entityType },
  { header: 'Percentage', accessor: p => p.percentage },
  { header: 'Notes', accessor: p => p.notes || '' },
  { header: 'Time Spent (minutes)', accessor: p => p.timeSpentMinutes || 0 },
  { header: 'Blockers', accessor: p => p.blockers.join('; ') },
  { header: 'Confidence Level', accessor: p => p.confidenceLevel || '' },
  { header: 'Motivation Level', accessor: p => p.motivationLevel || '' },
  { header: 'Perceived Difficulty', accessor: p => p.perceivedDifficulty || '' },
  { header: 'Emotional State', accessor: p => p.emotionalState || '' },
  { header: 'Created At', accessor: p => p.createdAt },
];

// Dependency columns
const dependencyColumns: CSVColumn<Dependency>[] = [
  { header: 'ID', accessor: d => d.id },
  { header: 'Source ID', accessor: d => d.sourceId },
  { header: 'Target ID', accessor: d => d.targetId },
  { header: 'Source Type', accessor: d => d.sourceType },
  { header: 'Target Type', accessor: d => d.targetType },
  { header: 'Dependency Type', accessor: d => d.dependencyType },
  { header: 'Created At', accessor: d => d.createdAt },
];

/**
 * Exports goals to CSV format
 */
export function exportGoalsToCSV(goals: Goal[]): string {
  return toCSV(goals, goalColumns);
}

/**
 * Exports milestones to CSV format
 */
export function exportMilestonesToCSV(milestones: Milestone[]): string {
  return toCSV(milestones, milestoneColumns);
}

/**
 * Exports progress updates to CSV format
 */
export function exportProgressUpdatesToCSV(progressUpdates: ProgressUpdate[]): string {
  return toCSV(progressUpdates, progressUpdateColumns);
}

/**
 * Exports dependencies to CSV format
 */
export function exportDependenciesToCSV(dependencies: Dependency[]): string {
  return toCSV(dependencies, dependencyColumns);
}

/**
 * Creates a zip file with multiple CSV files
 */
export async function downloadAllCSV(
  data: ExportData,
  filename: string = 'goal-tracking-export'
): Promise<void> {
  // For now, we'll create a combined CSV with section headers
  const sections = [
    '# GOALS',
    exportGoalsToCSV(data.goals),
    '',
    '# MILESTONES',
    exportMilestonesToCSV(data.milestones),
    '',
    '# PROGRESS UPDATES',
    exportProgressUpdatesToCSV(data.progressUpdates),
    '',
    '# DEPENDENCIES',
    exportDependenciesToCSV(data.dependencies),
  ];
  
  const combinedCSV = sections.join('\n');
  const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// ============================================================================
// Download Helpers
// ============================================================================

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Import Validation
// ============================================================================

interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    goalsCount: number;
    milestonesCount: number;
    progressUpdatesCount: number;
    dependenciesCount: number;
  };
}

/**
 * Validates imported JSON data before processing
 */
export function validateImportData(data: unknown): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid data format: expected an object'],
      warnings: [],
      summary: { goalsCount: 0, milestonesCount: 0, progressUpdatesCount: 0, dependenciesCount: 0 },
    };
  }
  
  const obj = data as Record<string, unknown>;
  
  // Check required fields
  if (!Array.isArray(obj.goals)) {
    errors.push('Missing or invalid "goals" array');
  }
  if (!Array.isArray(obj.milestones)) {
    errors.push('Missing or invalid "milestones" array');
  }
  if (!Array.isArray(obj.progressUpdates)) {
    errors.push('Missing or invalid "progressUpdates" array');
  }
  if (!Array.isArray(obj.dependencies)) {
    errors.push('Missing or invalid "dependencies" array');
  }
  
  // Validate version
  if (!obj.version) {
    warnings.push('Missing version field - assuming current version');
  }
  
  // Validate timestamps
  if (!obj.exportedAt) {
    warnings.push('Missing exportedAt timestamp');
  }
  
  // Count items
  const goalsCount = Array.isArray(obj.goals) ? obj.goals.length : 0;
  const milestonesCount = Array.isArray(obj.milestones) ? obj.milestones.length : 0;
  const progressUpdatesCount = Array.isArray(obj.progressUpdates) ? obj.progressUpdates.length : 0;
  const dependenciesCount = Array.isArray(obj.dependencies) ? obj.dependencies.length : 0;
  
  // Validate goal references in milestones
  if (Array.isArray(obj.goals) && Array.isArray(obj.milestones)) {
    const goalIds = new Set((obj.goals as Goal[]).map(g => g.id));
    for (const milestone of obj.milestones as Milestone[]) {
      if (!goalIds.has(milestone.goalId)) {
        warnings.push(`Milestone "${milestone.title}" references non-existent goal ${milestone.goalId}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      goalsCount,
      milestonesCount,
      progressUpdatesCount,
      dependenciesCount,
    },
  };
}

// ============================================================================
// Filtered Export
// ============================================================================

/**
 * Exports data based on configuration options
 */
export function exportWithConfig(
  data: ExportData,
  config: ExportConfig
): Partial<ExportData> {
  const result: Partial<ExportData> = {
    exportedAt: new Date().toISOString(),
    version: data.version,
  };
  
  // Filter by date range if specified
  const filterByDate = (date: string | undefined): boolean => {
    if (!date) return true;
    if (!config.dateRange) return true;
    
    const itemDate = new Date(date);
    if (config.dateRange.from && itemDate < new Date(config.dateRange.from)) {
      return false;
    }
    if (config.dateRange.to && itemDate > new Date(config.dateRange.to)) {
      return false;
    }
    return true;
  };
  
  if (config.includeGoals) {
    result.goals = data.goals.filter(g => filterByDate(g.createdAt));
  }
  
  if (config.includeMilestones) {
    const includedGoalIds = new Set(result.goals?.map(g => g.id) || data.goals.map(g => g.id));
    result.milestones = data.milestones.filter(m => 
      includedGoalIds.has(m.goalId) && filterByDate(m.createdAt)
    );
  }
  
  if (config.includeProgressUpdates) {
    result.progressUpdates = data.progressUpdates.filter(p => filterByDate(p.createdAt));
  }
  
  if (config.includeVersionHistory) {
    result.versionHistory = data.versionHistory.filter(v => filterByDate(v.createdAt));
  }
  
  return result;
}
