// Goal Tracking Application - Core Type Definitions
// Using Zod for schema validation with TypeScript inference

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export const GoalStates = ['planned', 'active', 'paused', 'completed', 'failed', 'abandoned'] as const;
export type GoalState = typeof GoalStates[number];

export const PriorityLevels = ['low', 'medium', 'high', 'critical'] as const;
export type PriorityLevel = typeof PriorityLevels[number];

export const EmotionalStates = ['motivated', 'neutral', 'stressed', 'burned_out', 'energized', 'discouraged'] as const;
export type EmotionalState = typeof EmotionalStates[number];

// Valid state transitions map
export const ValidStateTransitions: Record<GoalState, GoalState[]> = {
  planned: ['active', 'abandoned'],
  active: ['paused', 'completed', 'failed', 'abandoned'],
  paused: ['active', 'abandoned'],
  completed: [], // Terminal state - no transitions allowed
  failed: [], // Terminal state - no transitions allowed
  abandoned: [], // Terminal state - no transitions allowed
};

// ============================================================================
// Base Schemas
// ============================================================================

export const TimestampSchema = z.string().datetime();
export const UUIDSchema = z.string().uuid();

// ============================================================================
// Progress Update Schema
// ============================================================================

export const ProgressUpdateSchema = z.object({
  id: UUIDSchema,
  entityId: UUIDSchema, // Can be goal or milestone id
  entityType: z.enum(['goal', 'milestone']),
  percentage: z.number().min(0).max(100),
  notes: z.string().optional(),
  timeSpentMinutes: z.number().min(0).optional(),
  blockers: z.array(z.string()).default([]),
  confidenceLevel: z.number().min(1).max(10).optional(),
  motivationLevel: z.number().min(1).max(10).optional(),
  perceivedDifficulty: z.number().min(1).max(10).optional(),
  emotionalState: z.enum(EmotionalStates).optional(),
  createdAt: TimestampSchema,
});

export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;

// ============================================================================
// Outcome Schema
// ============================================================================

export const ExpectedOutcomeSchema = z.object({
  description: z.string().min(1),
  successMetrics: z.array(z.string()),
  estimatedTimelineDays: z.number().min(0).optional(),
  estimatedEffortHours: z.number().min(0).optional(),
  estimatedDifficulty: z.number().min(1).max(10).optional(),
});

export const ActualOutcomeSchema = z.object({
  description: z.string(),
  successScore: z.number().min(0).max(100).optional(), // 0-100 percentage
  timelineDeviation: z.number().optional(), // Positive = late, negative = early (days)
  effortDeviation: z.number().optional(), // Positive = more effort, negative = less
  retrospectiveNotes: z.string().optional(),
  lessonsLearned: z.array(z.string()).default([]),
  recordedAt: TimestampSchema,
});

export type ExpectedOutcome = z.infer<typeof ExpectedOutcomeSchema>;
export type ActualOutcome = z.infer<typeof ActualOutcomeSchema>;

// ============================================================================
// Decision Record Schema
// ============================================================================

export const DecisionRecordSchema = z.object({
  id: UUIDSchema,
  goalId: UUIDSchema,
  milestoneId: UUIDSchema.optional(),
  decision: z.string().min(1),
  reasoning: z.string().optional(),
  alternatives: z.array(z.string()).default([]),
  outcome: z.enum(['positive', 'negative', 'neutral', 'pending']).default('pending'),
  reflectionNotes: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type DecisionRecord = z.infer<typeof DecisionRecordSchema>;

// ============================================================================
// Dependency Schema
// ============================================================================

export const DependencySchema = z.object({
  id: UUIDSchema,
  sourceId: UUIDSchema, // The item that depends on another
  targetId: UUIDSchema, // The item being depended upon
  sourceType: z.enum(['goal', 'milestone']),
  targetType: z.enum(['goal', 'milestone']),
  dependencyType: z.enum(['blocks', 'requires', 'soft_dependency']),
  createdAt: TimestampSchema,
});

export type Dependency = z.infer<typeof DependencySchema>;

// ============================================================================
// Milestone Schema
// ============================================================================

export const MilestoneSchema = z.object({
  id: UUIDSchema,
  goalId: UUIDSchema,
  parentMilestoneId: UUIDSchema.optional(), // For sub-milestones
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(PriorityLevels).default('medium'),
  state: z.enum(GoalStates).default('planned'),
  progress: z.number().min(0).max(100).default(0),
  order: z.number().int().min(0).default(0),
  targetDate: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  expectedOutcome: ExpectedOutcomeSchema.optional(),
  actualOutcome: ActualOutcomeSchema.optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Milestone = z.infer<typeof MilestoneSchema>;

// ============================================================================
// Goal Schema
// ============================================================================

export const GoalSchema = z.object({
  id: UUIDSchema,
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(PriorityLevels).default('medium'),
  priorityWeight: z.number().min(1).max(100).default(50), // Numeric weight for analytics
  state: z.enum(GoalStates).default('planned'),
  progress: z.number().min(0).max(100).default(0),
  
  // Timeline
  startDate: TimestampSchema.optional(),
  targetDate: TimestampSchema.optional(),
  completedAt: TimestampSchema.optional(),
  
  // Success criteria
  successCriteria: z.array(z.string()).default([]),
  motivationNotes: z.string().optional(),
  
  // Outcomes
  expectedOutcome: ExpectedOutcomeSchema.optional(),
  actualOutcome: ActualOutcomeSchema.optional(),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});

export type Goal = z.infer<typeof GoalSchema>;

// ============================================================================
// Version History Schema
// ============================================================================

export const VersionSnapshotSchema = z.object({
  id: UUIDSchema,
  entityId: UUIDSchema,
  entityType: z.enum(['goal', 'milestone', 'dependency']),
  version: z.number().int().min(1),
  snapshot: z.record(z.string(), z.unknown()), // Store the full entity state
  changeDescription: z.string().optional(),
  changedFields: z.array(z.string()).default([]),
  createdAt: TimestampSchema,
});

export type VersionSnapshot = z.infer<typeof VersionSnapshotSchema>;

// ============================================================================
// Analytics Schemas
// ============================================================================

export const VelocityMetricsSchema = z.object({
  entityId: UUIDSchema,
  entityType: z.enum(['goal', 'milestone']),
  progressPerDay: z.number(),
  progressPerWeek: z.number(),
  accelerationTrend: z.enum(['accelerating', 'decelerating', 'stable', 'stagnant']),
  lastActiveDate: TimestampSchema.optional(),
  stagnationDays: z.number().int().min(0).default(0),
  computedAt: TimestampSchema,
});

export type VelocityMetrics = z.infer<typeof VelocityMetricsSchema>;

export const EstimationAccuracySchema = z.object({
  entityId: UUIDSchema,
  entityType: z.enum(['goal', 'milestone']),
  timelineAccuracy: z.number().optional(), // Percentage (100 = perfect)
  effortAccuracy: z.number().optional(),
  difficultyAccuracy: z.number().optional(),
  overallAccuracy: z.number().optional(),
  bias: z.enum(['overestimate', 'underestimate', 'accurate', 'unknown']).default('unknown'),
  computedAt: TimestampSchema,
});

export type EstimationAccuracy = z.infer<typeof EstimationAccuracySchema>;

export const OutcomeQualityScoreSchema = z.object({
  entityId: UUIDSchema,
  entityType: z.enum(['goal', 'milestone']),
  timelinessScore: z.number().min(0).max(100).default(0),
  scopeAdherenceScore: z.number().min(0).max(100).default(0),
  impactScore: z.number().min(0).max(100).default(0),
  efficiencyScore: z.number().min(0).max(100).default(0),
  satisfactionScore: z.number().min(0).max(100).default(0),
  overallScore: z.number().min(0).max(100).default(0),
  explanation: z.string().optional(),
  computedAt: TimestampSchema,
});

export type OutcomeQualityScore = z.infer<typeof OutcomeQualityScoreSchema>;

export const TrendAnalysisSchema = z.object({
  userId: z.string().default('default'),
  consistencyScore: z.number().min(0).max(100).default(0),
  motivationTrend: z.enum(['improving', 'declining', 'stable', 'volatile']).default('stable'),
  completionReliability: z.number().min(0).max(100).default(0),
  abandonmentRate: z.number().min(0).max(100).default(0),
  burnoutRisk: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  recoveryPattern: z.string().optional(),
  averageVelocity: z.number().default(0),
  optimismBias: z.number().optional(), // Positive = optimistic, negative = pessimistic
  computedAt: TimestampSchema,
});

export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;

// ============================================================================
// Simulation Schema
// ============================================================================

export const SimulationScenarioSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  modifications: z.array(z.object({
    entityId: UUIDSchema,
    entityType: z.enum(['goal', 'milestone']),
    field: z.string(),
    newValue: z.unknown(),
  })),
  predictedCompletionProbability: z.number().min(0).max(100).optional(),
  predictedWorkloadImpact: z.number().optional(),
  predictedTimelineImpact: z.number().optional(), // Days
  createdAt: TimestampSchema,
});

export type SimulationScenario = z.infer<typeof SimulationScenarioSchema>;

// ============================================================================
// Filter and Sort Schemas
// ============================================================================

export const GoalFilterSchema = z.object({
  states: z.array(z.enum(GoalStates)).optional(),
  priorities: z.array(z.enum(PriorityLevels)).optional(),
  tags: z.array(z.string()).optional(),
  minProgress: z.number().min(0).max(100).optional(),
  maxProgress: z.number().min(0).max(100).optional(),
  hasBlockers: z.boolean().optional(),
  minVelocity: z.number().optional(),
  maxVelocity: z.number().optional(),
  searchQuery: z.string().optional(),
  startDateFrom: TimestampSchema.optional(),
  startDateTo: TimestampSchema.optional(),
  targetDateFrom: TimestampSchema.optional(),
  targetDateTo: TimestampSchema.optional(),
  
  // Advanced Filters
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  motivationTrend: z.enum(['improving', 'declining', 'stable', 'volatile']).optional(),
});

export type GoalFilter = z.infer<typeof GoalFilterSchema>;

export const SortOptionsSchema = z.object({
  field: z.enum([
    'title', 'priority', 'priorityWeight', 'state', 'progress',
    'startDate', 'targetDate', 'createdAt', 'updatedAt', 'velocity'
  ]),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

export type SortOptions = z.infer<typeof SortOptionsSchema>;

// ============================================================================
// Export Configuration Schema
// ============================================================================

export const ExportConfigSchema = z.object({
  format: z.enum(['json', 'csv']),
  includeGoals: z.boolean().default(true),
  includeMilestones: z.boolean().default(true),
  includeProgressUpdates: z.boolean().default(true),
  includeAnalytics: z.boolean().default(true),
  includeVersionHistory: z.boolean().default(false),
  dateRange: z.object({
    from: TimestampSchema.optional(),
    to: TimestampSchema.optional(),
  }).optional(),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates if a state transition is allowed
 */
export function isValidStateTransition(currentState: GoalState, newState: GoalState): boolean {
  if (currentState === newState) return true;
  return ValidStateTransitions[currentState].includes(newState);
}

/**
 * Validates a goal object and returns parsed result or error
 */
export function validateGoal(data: unknown): { success: true; data: Goal } | { success: false; errors: z.ZodError } {
  const result = GoalSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates a milestone object and returns parsed result or error
 */
export function validateMilestone(data: unknown): { success: true; data: Milestone } | { success: false; errors: z.ZodError } {
  const result = MilestoneSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates a progress update and returns parsed result or error
 */
export function validateProgressUpdate(data: unknown): { success: true; data: ProgressUpdate } | { success: false; errors: z.ZodError } {
  const result = ProgressUpdateSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Validates a dependency and checks for basic consistency
 */
export function validateDependency(data: unknown): { success: true; data: Dependency } | { success: false; errors: z.ZodError } {
  const result = DependencySchema.safeParse(data);
  if (result.success) {
    // Additional validation: source and target must be different
    if (result.data.sourceId === result.data.targetId) {
      return {
        success: false,
        errors: new z.ZodError([{
          code: 'custom',
          path: ['sourceId', 'targetId'],
          message: 'A dependency cannot have the same source and target',
        }]),
      };
    }
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
