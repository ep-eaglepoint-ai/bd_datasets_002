// CSV Import functionality for goals and milestones
// Provides parsing, validation, and schema mapping

import { Goal, Milestone, GoalSchema, MilestoneSchema } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface CsvParseResult<T> {
  success: boolean;
  data: T[];
  errors: CsvError[];
  warnings: string[];
}

export interface CsvError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

// Column mapping configuration
interface ColumnMapping {
  csvColumn: string;
  schemaField: string;
  transform?: (value: string) => unknown;
  required?: boolean;
}

const GOAL_COLUMN_MAPPINGS: ColumnMapping[] = [
  { csvColumn: 'title', schemaField: 'title', required: true },
  { csvColumn: 'description', schemaField: 'description' },
  { csvColumn: 'priority', schemaField: 'priority', transform: (v) => v.toLowerCase() },
  { csvColumn: 'state', schemaField: 'state', transform: (v) => v.toLowerCase() },
  { csvColumn: 'target_date', schemaField: 'targetDate', transform: parseDate },
  { csvColumn: 'start_date', schemaField: 'startDate', transform: parseDate },
  { csvColumn: 'tags', schemaField: 'tags', transform: parseTags },
  { csvColumn: 'priority_weight', schemaField: 'priorityWeight', transform: (v) => parseInt(v, 10) || 50 },
  { csvColumn: 'progress', schemaField: 'progress', transform: (v) => parseInt(v, 10) || 0 },
];

const MILESTONE_COLUMN_MAPPINGS: ColumnMapping[] = [
  { csvColumn: 'title', schemaField: 'title', required: true },
  { csvColumn: 'description', schemaField: 'description' },
  { csvColumn: 'goal_id', schemaField: 'goalId', required: true },
  { csvColumn: 'parent_milestone_id', schemaField: 'parentMilestoneId' },
  { csvColumn: 'target_date', schemaField: 'targetDate', transform: parseDate },
  { csvColumn: 'state', schemaField: 'state', transform: (v) => v.toLowerCase() },
  { csvColumn: 'progress', schemaField: 'progress', transform: (v) => parseInt(v, 10) || 0 },
];

// Helper functions
function parseDate(value: string): string | undefined {
  if (!value || value.trim() === '') return undefined;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString();
  } catch {
    return undefined;
  }
}

function parseTags(value: string): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(/[,;|]/).map(tag => tag.trim()).filter(Boolean);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseCsv(csvContent: string): { headers: string[]; rows: string[][] } {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const rows = lines.slice(1).map(parseCsvLine);
  
  return { headers, rows };
}

export function importGoalsFromCsv(csvContent: string): CsvParseResult<Goal> {
  const { headers, rows } = parseCsv(csvContent);
  const errors: CsvError[] = [];
  const warnings: string[] = [];
  const goals: Goal[] = [];
  
  if (headers.length === 0) {
    return { success: false, data: [], errors: [{ row: 0, column: '', message: 'Empty CSV file' }], warnings: [] };
  }
  
  // Validate required columns
  const requiredColumns = GOAL_COLUMN_MAPPINGS.filter(m => m.required).map(m => m.csvColumn);
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: '', message: `Missing required columns: ${missingColumns.join(', ')}` }],
      warnings: []
    };
  }
  
  rows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2; // Account for 0-based and header row
    const goalData: Record<string, unknown> = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      priorityWeight: 50,
      tags: [],
      state: 'planned',
      priority: 'medium',
    };
    
    GOAL_COLUMN_MAPPINGS.forEach(mapping => {
      const colIndex = headers.indexOf(mapping.csvColumn);
      if (colIndex === -1) return;
      
      const rawValue = row[colIndex]?.trim() || '';
      
      if (!rawValue && mapping.required) {
        errors.push({
          row: rowNum,
          column: mapping.csvColumn,
          message: `Required field '${mapping.csvColumn}' is empty`,
        });
        return;
      }
      
      if (!rawValue) return;
      
      const value = mapping.transform ? mapping.transform(rawValue) : rawValue;
      goalData[mapping.schemaField] = value;
    });
    
    // Validate with Zod
    try {
      const validated = GoalSchema.parse(goalData);
      goals.push(validated as Goal);
    } catch (error) {
      errors.push({
        row: rowNum,
        column: '',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });
  
  if (goals.length < rows.length && goals.length > 0) {
    warnings.push(`${rows.length - goals.length} rows failed validation`);
  }
  
  return {
    success: errors.length === 0 || goals.length > 0,
    data: goals,
    errors,
    warnings,
  };
}

export function importMilestonesFromCsv(csvContent: string, existingGoalIds: string[]): CsvParseResult<Milestone> {
  const { headers, rows } = parseCsv(csvContent);
  const errors: CsvError[] = [];
  const warnings: string[] = [];
  const milestones: Milestone[] = [];
  
  if (headers.length === 0) {
    return { success: false, data: [], errors: [{ row: 0, column: '', message: 'Empty CSV file' }], warnings: [] };
  }
  
  // Validate required columns
  const requiredColumns = MILESTONE_COLUMN_MAPPINGS.filter(m => m.required).map(m => m.csvColumn);
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    return {
      success: false,
      data: [],
      errors: [{ row: 0, column: '', message: `Missing required columns: ${missingColumns.join(', ')}` }],
      warnings: []
    };
  }
  
  rows.forEach((row, rowIndex) => {
    const rowNum = rowIndex + 2;
    const milestoneData: Record<string, unknown> = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      state: 'planned',
    };
    
    MILESTONE_COLUMN_MAPPINGS.forEach(mapping => {
      const colIndex = headers.indexOf(mapping.csvColumn);
      if (colIndex === -1) return;
      
      const rawValue = row[colIndex]?.trim() || '';
      
      if (!rawValue && mapping.required) {
        errors.push({
          row: rowNum,
          column: mapping.csvColumn,
          message: `Required field '${mapping.csvColumn}' is empty`,
        });
        return;
      }
      
      if (!rawValue) return;
      
      const value = mapping.transform ? mapping.transform(rawValue) : rawValue;
      milestoneData[mapping.schemaField] = value;
    });
    
    // Validate goal_id exists
    const goalId = milestoneData.goalId as string;
    if (goalId && !existingGoalIds.includes(goalId)) {
      warnings.push(`Row ${rowNum}: goal_id '${goalId}' not found, milestone will be orphaned`);
    }
    
    // Validate with Zod
    try {
      const validated = MilestoneSchema.parse(milestoneData);
      milestones.push(validated as Milestone);
    } catch (error) {
      errors.push({
        row: rowNum,
        column: '',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  });
  
  return {
    success: errors.length === 0 || milestones.length > 0,
    data: milestones,
    errors,
    warnings,
  };
}

// Generate sample CSV template
export function generateGoalsCsvTemplate(): string {
  return `title,description,priority,state,target_date,tags,progress
"My First Goal","Description of the goal",high,active,2024-12-31,"tag1,tag2",25
"Another Goal","Another description",medium,planned,2025-01-15,productivity,0`;
}

export function generateMilestonesCsvTemplate(): string {
  return `title,description,goal_id,target_date,state,progress
"Milestone 1","First milestone","<goal-uuid>",2024-12-15,active,50
"Milestone 2","Second milestone","<goal-uuid>",2024-12-25,planned,0`;
}
