export * from './forms/GoalEditor';
export * from './forms/MilestoneEditor';
export * from './forms/ProgressLogger';

// Alias for backward compatibility if needed, but components should update imports to use the named exports
// or we can re-export them with aliases matching original names
import { GoalEditor } from './forms/GoalEditor';
import { MilestoneEditor } from './forms/MilestoneEditor';
import { ProgressLogger } from './forms/ProgressLogger';

export const GoalForm = GoalEditor;
export const MilestoneForm = MilestoneEditor;
export const ProgressUpdateForm = ProgressLogger;
