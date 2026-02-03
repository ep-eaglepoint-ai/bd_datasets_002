/**
 * Types Tests - validates Zod schema definitions and type inference
 */

import { 
  GoalSchema,
  MilestoneSchema,
  ProgressUpdateSchema,
  DependencySchema,
  validateGoal,
  validateMilestone,
  validateProgressUpdate,
  validateDependency,
  isValidStateTransition,
  GoalStates,
  PriorityLevels,
  ValidStateTransitions,
  Goal,
  Milestone,
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

describe('Goal Schema', () => {
  const validGoal = {
    id: uuidv4(),
    title: 'Learn TypeScript',
    description: 'Master TypeScript for better code quality',
    priority: 'high' as const,
    priorityWeight: 75,
    state: 'active' as const,
    progress: 25,
    startDate: new Date().toISOString(),
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    successCriteria: ['Complete course', 'Build project'],
    motivationNotes: 'Career advancement',
    tags: ['programming', 'learning'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('should validate a correct goal', () => {
    const result = GoalSchema.safeParse(validGoal);
    expect(result.success).toBe(true);
  });

  test('should reject goal without title', () => {
    const invalidGoal = { ...validGoal, title: '' };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should reject goal with title over 200 characters', () => {
    const invalidGoal = { ...validGoal, title: 'a'.repeat(201) };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should reject goal with invalid UUID', () => {
    const invalidGoal = { ...validGoal, id: 'not-a-uuid' };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should reject goal with invalid state', () => {
    const invalidGoal = { ...validGoal, state: 'invalid' };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should reject goal with invalid priority', () => {
    const invalidGoal = { ...validGoal, priority: 'super-high' };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should reject goal with progress over 100', () => {
    const invalidGoal = { ...validGoal, progress: 150 };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should reject goal with negative progress', () => {
    const invalidGoal = { ...validGoal, progress: -10 };
    const result = GoalSchema.safeParse(invalidGoal);
    expect(result.success).toBe(false);
  });

  test('should use default values for optional fields', () => {
    const minimalGoal = {
      id: uuidv4(),
      title: 'Minimal Goal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = GoalSchema.safeParse(minimalGoal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('medium');
      expect(result.data.state).toBe('planned');
      expect(result.data.progress).toBe(0);
      expect(result.data.priorityWeight).toBe(50);
      expect(result.data.successCriteria).toEqual([]);
      expect(result.data.tags).toEqual([]);
    }
  });
});

describe('Milestone Schema', () => {
  const validMilestone = {
    id: uuidv4(),
    goalId: uuidv4(),
    title: 'Complete Module 1',
    description: 'Finish the first module of the course',
    priority: 'medium' as const,
    state: 'planned' as const,
    progress: 0,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('should validate a correct milestone', () => {
    const result = MilestoneSchema.safeParse(validMilestone);
    expect(result.success).toBe(true);
  });

  test('should accept milestone with parent', () => {
    const milestoneWithParent = {
      ...validMilestone,
      parentMilestoneId: uuidv4(),
    };
    const result = MilestoneSchema.safeParse(milestoneWithParent);
    expect(result.success).toBe(true);
  });

  test('should reject milestone without goalId', () => {
    const { goalId, ...invalidMilestone } = validMilestone;
    const result = MilestoneSchema.safeParse(invalidMilestone);
    expect(result.success).toBe(false);
  });
});

describe('Progress Update Schema', () => {
  const validProgressUpdate = {
    id: uuidv4(),
    entityId: uuidv4(),
    entityType: 'goal' as const,
    percentage: 50,
    notes: 'Made good progress today',
    timeSpentMinutes: 120,
    blockers: ['Waiting for API access'],
    confidenceLevel: 8,
    motivationLevel: 7,
    perceivedDifficulty: 5,
    emotionalState: 'motivated' as const,
    createdAt: new Date().toISOString(),
  };

  test('should validate a correct progress update', () => {
    const result = ProgressUpdateSchema.safeParse(validProgressUpdate);
    expect(result.success).toBe(true);
  });

  test('should reject percentage over 100', () => {
    const invalid = { ...validProgressUpdate, percentage: 101 };
    const result = ProgressUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('should reject confidence level over 10', () => {
    const invalid = { ...validProgressUpdate, confidenceLevel: 11 };
    const result = ProgressUpdateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  test('should accept valid emotional states', () => {
    const emotionalStates = ['motivated', 'neutral', 'stressed', 'burned_out', 'energized', 'discouraged'];
    for (const state of emotionalStates) {
      const update = { ...validProgressUpdate, emotionalState: state };
      const result = ProgressUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    }
  });
});

describe('Dependency Schema', () => {
  const validDependency = {
    id: uuidv4(),
    sourceId: uuidv4(),
    targetId: uuidv4(),
    sourceType: 'goal' as const,
    targetType: 'milestone' as const,
    dependencyType: 'blocks' as const,
    createdAt: new Date().toISOString(),
  };

  test('should validate a correct dependency', () => {
    const result = DependencySchema.safeParse(validDependency);
    expect(result.success).toBe(true);
  });

  test('should reject self-referencing dependency via validateDependency', () => {
    const selfRef = {
      ...validDependency,
      targetId: validDependency.sourceId,
    };
    const result = validateDependency(selfRef);
    expect(result.success).toBe(false);
  });
});

describe('State Transitions', () => {
  test('should allow valid state transitions', () => {
    expect(isValidStateTransition('planned', 'active')).toBe(true);
    expect(isValidStateTransition('active', 'completed')).toBe(true);
    expect(isValidStateTransition('active', 'paused')).toBe(true);
    expect(isValidStateTransition('paused', 'active')).toBe(true);
    expect(isValidStateTransition('active', 'failed')).toBe(true);
    expect(isValidStateTransition('planned', 'abandoned')).toBe(true);
  });

  test('should reject invalid state transitions', () => {
    expect(isValidStateTransition('completed', 'active')).toBe(false);
    expect(isValidStateTransition('failed', 'completed')).toBe(false);
    expect(isValidStateTransition('abandoned', 'active')).toBe(false);
    expect(isValidStateTransition('planned', 'completed')).toBe(false);
  });

  test('should allow same state transition (no-op)', () => {
    for (const state of GoalStates) {
      expect(isValidStateTransition(state, state)).toBe(true);
    }
  });

  test('should have correct terminal states', () => {
    expect(ValidStateTransitions.completed).toEqual([]);
    expect(ValidStateTransitions.failed).toEqual([]);
    expect(ValidStateTransitions.abandoned).toEqual([]);
  });
});

describe('Validation Helpers', () => {
  test('validateGoal should return success for valid goal', () => {
    const goal = {
      id: uuidv4(),
      title: 'Valid Goal',
      priority: 'high',
      priorityWeight: 80,
      state: 'planned',
      progress: 0,
      successCriteria: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = validateGoal(goal);
    expect(result.success).toBe(true);
  });

  test('validateGoal should return errors for invalid goal', () => {
    const result = validateGoal({ title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
    }
  });

  test('validateMilestone should return success for valid milestone', () => {
    const milestone = {
      id: uuidv4(),
      goalId: uuidv4(),
      title: 'Valid Milestone',
      priority: 'medium',
      state: 'planned',
      progress: 0,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = validateMilestone(milestone);
    expect(result.success).toBe(true);
  });

  test('validateProgressUpdate should return success for valid update', () => {
    const update = {
      id: uuidv4(),
      entityId: uuidv4(),
      entityType: 'goal',
      percentage: 50,
      blockers: [],
      createdAt: new Date().toISOString(),
    };
    const result = validateProgressUpdate(update);
    expect(result.success).toBe(true);
  });
});

describe('Type Constants', () => {
  test('GoalStates should contain all valid states', () => {
    expect(GoalStates).toContain('planned');
    expect(GoalStates).toContain('active');
    expect(GoalStates).toContain('paused');
    expect(GoalStates).toContain('completed');
    expect(GoalStates).toContain('failed');
    expect(GoalStates).toContain('abandoned');
    expect(GoalStates.length).toBe(6);
  });

  test('PriorityLevels should contain all valid priorities', () => {
    expect(PriorityLevels).toContain('low');
    expect(PriorityLevels).toContain('medium');
    expect(PriorityLevels).toContain('high');
    expect(PriorityLevels).toContain('critical');
    expect(PriorityLevels.length).toBe(4);
  });
});
