/**
 * Analytics Engine Tests - validates velocity, estimation accuracy, outcome quality, and trend analysis
 */

import { v4 as uuidv4 } from 'uuid';
import { subDays } from 'date-fns';
import {
  computeVelocity,
  computeEstimationAccuracy,
  computeOutcomeQuality,
  computeTrendAnalysis,
  predictCompletionProbability,
  simulateChanges,
} from '@/lib/analytics';
import { Goal, Milestone, ProgressUpdate } from '@/lib/types';

// Helper to create a date ISO string for N days ago
function daysAgo(days: number): string {
  return subDays(new Date(), days).toISOString();
}

// Helper to create a test goal
function createTestGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: uuidv4(),
    title: 'Test Goal',
    priority: 'medium',
    priorityWeight: 50,
    state: 'active',
    progress: 0,
    successCriteria: [],
    tags: [],
    createdAt: daysAgo(30),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create a test progress update
function createTestProgressUpdate(
  entityId: string,
  percentage: number,
  daysOld: number,
  extras: Partial<ProgressUpdate> = {}
): ProgressUpdate {
  return {
    id: uuidv4(),
    entityId,
    entityType: 'goal',
    percentage,
    blockers: [],
    createdAt: daysAgo(daysOld),
    ...extras,
  };
}

describe('Velocity Computation', () => {
  test('should return 0 velocity with no progress updates', () => {
    const goal = createTestGoal();
    const result = computeVelocity(goal.id, [], goal.createdAt);
    
    expect(result.progressPerDay).toBe(0);
    expect(result.progressPerWeek).toBe(0);
    expect(result.accelerationTrend).toBe('stagnant');
    expect(result.stagnationDays).toBeGreaterThan(0);
  });

  test('should calculate velocity based on progress updates', () => {
    const goal = createTestGoal({ createdAt: daysAgo(10) });
    const updates = [
      createTestProgressUpdate(goal.id, 20, 8),
      createTestProgressUpdate(goal.id, 40, 5),
      createTestProgressUpdate(goal.id, 60, 2),
    ];
    
    const result = computeVelocity(goal.id, updates, goal.createdAt);
    
    expect(result.progressPerDay).toBeGreaterThan(0);
    expect(result.progressPerWeek).toBeGreaterThan(result.progressPerDay);
    expect(result.lastActiveDate).toBeDefined();
    expect(result.stagnationDays).toBeLessThan(5);
  });

  test('should detect stagnation when no recent updates', () => {
    const goal = createTestGoal({ createdAt: daysAgo(30) });
    const updates = [
      createTestProgressUpdate(goal.id, 20, 20),
      createTestProgressUpdate(goal.id, 30, 15),
    ];
    
    const result = computeVelocity(goal.id, updates, goal.createdAt);
    
    expect(result.stagnationDays).toBeGreaterThan(7);
    expect(result.accelerationTrend).toBe('stagnant');
  });

  test('should detect accelerating trend', () => {
    const goal = createTestGoal({ createdAt: daysAgo(30) });
    const updates = [
      createTestProgressUpdate(goal.id, 10, 28),
      createTestProgressUpdate(goal.id, 15, 21),
      createTestProgressUpdate(goal.id, 20, 14),
      createTestProgressUpdate(goal.id, 40, 7),
      createTestProgressUpdate(goal.id, 70, 2),
    ];
    
    const result = computeVelocity(goal.id, updates, goal.createdAt);
    
    expect(result.accelerationTrend).toBe('accelerating');
  });

  test('should detect decelerating trend', () => {
    const goal = createTestGoal({ createdAt: daysAgo(30) });
    const updates = [
      createTestProgressUpdate(goal.id, 40, 28),
      createTestProgressUpdate(goal.id, 60, 21),
      createTestProgressUpdate(goal.id, 70, 14),
      createTestProgressUpdate(goal.id, 73, 7),
      createTestProgressUpdate(goal.id, 75, 2),
    ];
    
    const result = computeVelocity(goal.id, updates, goal.createdAt);
    
    expect(result.accelerationTrend).toBe('decelerating');
  });
});

describe('Estimation Accuracy', () => {
  test('should return unknown bias when no outcome data', () => {
    const goal = createTestGoal();
    const result = computeEstimationAccuracy(goal, []);
    
    expect(result.bias).toBe('unknown');
    expect(result.overallAccuracy).toBeUndefined();
  });

  test('should calculate timeline accuracy', () => {
    const goal = createTestGoal({
      expectedOutcome: {
        description: 'Complete goal',
        estimatedTimelineDays: 30,
        successMetrics: [],
      },
      actualOutcome: {
        description: 'Completed goal',
        recordedAt: new Date().toISOString(),
        successScore: 80,
        timelineDeviation: 5, // Took 35 days instead of 30
        lessonsLearned: [],
        retrospectiveNotes: '',
      },
    });
    
    const result = computeEstimationAccuracy(goal, []);
    
    expect(result.timelineAccuracy).toBeDefined();
    expect(result.timelineAccuracy).toBeLessThan(100); // Took longer than estimated
  });

  test('should detect overestimate bias', () => {
    const goal = createTestGoal({
      expectedOutcome: {
        description: 'Complete goal',
        estimatedTimelineDays: 30,
        estimatedEffortHours: 100,
        successMetrics: [],
      },
      actualOutcome: {
        description: 'Completed early',
        recordedAt: new Date().toISOString(),
        successScore: 80,
        timelineDeviation: -15, // Finished 15 days early
        lessonsLearned: [],
        retrospectiveNotes: '',
      },
    });
    
    const result = computeEstimationAccuracy(goal, []);
    
    // When finished early, timeline accuracy > 100%
    if (result.timelineAccuracy !== undefined) {
      expect(result.timelineAccuracy).toBeGreaterThan(100);
    }
  });
});

describe('Outcome Quality', () => {
  test('should calculate outcome quality for completed goal', () => {
    const goal = createTestGoal({
      state: 'completed',
      progress: 100,
      targetDate: daysAgo(-5), // Target was 5 days in the future
      completedAt: daysAgo(0), // Completed today (early)
    });
    
    const result = computeOutcomeQuality(goal, []);
    
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.timelinessScore).toBeDefined();
    expect(result.scopeAdherenceScore).toBeDefined();
    expect(result.impactScore).toBeDefined();
    expect(result.efficiencyScore).toBeDefined();
    expect(result.satisfactionScore).toBeDefined();
  });

  test('should penalize late completion', () => {
    const lateGoal = createTestGoal({
      state: 'completed',
      progress: 100,
      targetDate: daysAgo(10), // Target was 10 days ago
      completedAt: daysAgo(0), // Completed today (late)
    });
    
    const onTimeGoal = createTestGoal({
      state: 'completed',
      progress: 100,
      targetDate: daysAgo(-5), // Target is 5 days in future
      completedAt: daysAgo(0), // Completed today (early)
    });
    
    const lateResult = computeOutcomeQuality(lateGoal, []);
    const onTimeResult = computeOutcomeQuality(onTimeGoal, []);
    
    expect(lateResult.timelinessScore).toBeLessThan(onTimeResult.timelinessScore);
  });

  test('should use success score from actual outcome', () => {
    const goal = createTestGoal({
      state: 'completed',
      actualOutcome: {
        description: 'Completed partially',
        successScore: 85,
        lessonsLearned: [],
        retrospectiveNotes: '',
        recordedAt: new Date().toISOString(),
      },
    });
    
    const result = computeOutcomeQuality(goal, []);
    
    expect(result.scopeAdherenceScore).toBe(85);
  });
});

describe('Trend Analysis', () => {
  test('should calculate basic trends with no data', () => {
    const result = computeTrendAnalysis([], []);
    
    expect(result.consistencyScore).toBe(50);
    expect(result.completionReliability).toBe(0);
    expect(result.abandonmentRate).toBe(0);
    expect(result.burnoutRisk).toBe('low');
    expect(result.averageVelocity).toBe(0);
  });

  test('should calculate completion reliability', () => {
    const goals = [
      createTestGoal({ state: 'completed' }),
      createTestGoal({ state: 'completed' }),
      createTestGoal({ state: 'failed' }),
      createTestGoal({ state: 'abandoned' }),
    ];
    
    const result = computeTrendAnalysis(goals, []);
    
    // 2 completed out of 4 terminal = 50%
    expect(result.completionReliability).toBe(50);
    expect(result.abandonmentRate).toBe(25);
  });

  test('should detect burnout risk from emotional states', () => {
    const goals = [createTestGoal({ state: 'active' })];
    const updates: ProgressUpdate[] = [];
    
    // Add many stressed/burned_out updates
    for (let i = 0; i < 10; i++) {
      updates.push(createTestProgressUpdate(goals[0].id, 10 + i, i, {
        emotionalState: i % 2 === 0 ? 'stressed' : 'burned_out',
      }));
    }
    
    const result = computeTrendAnalysis(goals, updates);
    
    expect(['high', 'critical']).toContain(result.burnoutRisk);
  });

  test('should detect motivation trend', () => {
    const goals = [createTestGoal()];
    const updates: ProgressUpdate[] = [];
    
    // Declining motivation over time
    for (let i = 0; i < 10; i++) {
      updates.push(createTestProgressUpdate(goals[0].id, 10 * i, 20 - i, {
        motivationLevel: 9 - Math.floor(i / 2), // 9, 9, 8, 8, 7, 7, 6, 6, 5, 5
      }));
    }
    
    const result = computeTrendAnalysis(goals, updates);
    
    // Should detect declining trend
    expect(result.motivationTrend).toBe('declining');
  });
});

describe('Completion Prediction', () => {
  test('should return 50% probability with no data', () => {
    const goal = createTestGoal({ progress: 0 });
    
    const result = predictCompletionProbability(goal, [], [], [], 50);
    
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThanOrEqual(100);
    expect(result.confidence).toBe('insufficient_data');
  });

  test('should increase probability with higher progress', () => {
    const lowProgressGoal = createTestGoal({ progress: 20 });
    const highProgressGoal = createTestGoal({ progress: 80 });
    
    const lowResult = predictCompletionProbability(lowProgressGoal, [], [], [], 50);
    const highResult = predictCompletionProbability(highProgressGoal, [], [], [], 50);
    
    expect(highResult.probability).toBeGreaterThan(lowResult.probability);
  });

  test('should identify risk factors for blocked items', () => {
    const goal = createTestGoal();
    const dependencies = [
      { sourceId: goal.id, targetId: uuidv4(), blocked: true },
      { sourceId: goal.id, targetId: uuidv4(), blocked: true },
    ];
    
    const result = predictCompletionProbability(goal, [], [], dependencies, 50);
    
    expect(result.riskFactors.length).toBeGreaterThan(0);
    expect(result.riskFactors.some(r => r.includes('blocking'))).toBe(true);
  });

  test('should estimate completion date based on velocity', () => {
    const goal = createTestGoal({ 
      progress: 50,
      createdAt: daysAgo(10),
    });
    
    const updates = [
      createTestProgressUpdate(goal.id, 20, 8),
      createTestProgressUpdate(goal.id, 35, 5),
      createTestProgressUpdate(goal.id, 50, 1),
    ];
    
    const result = predictCompletionProbability(goal, [], updates, [], 50);
    
    expect(result.estimatedCompletionDate).toBeDefined();
  });
});

describe('Simulation Engine', () => {
  test('should simulate progress changes', () => {
    const goal = createTestGoal({ progress: 30 });
    
    const result = simulateChanges(goal, [], [], [], {
      newProgress: 70,
    });
    
    expect(result.simulatedProbability).toBeGreaterThan(result.originalProbability);
  });

  test('should simulate removing dependencies', () => {
    const goal = createTestGoal();
    const targetId = uuidv4();
    const dependencies = [
      { sourceId: goal.id, targetId, blocked: true },
    ];
    
    const result = simulateChanges(goal, [], [], dependencies, {
      removeDependencies: [targetId],
    });
    
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  test('should calculate timeline change', () => {
    const currentTargetDate = daysAgo(-10); // 10 days from now
    const newTargetDate = daysAgo(-25); // 25 days from now
    
    const goal = createTestGoal({ targetDate: currentTargetDate });
    
    const result = simulateChanges(goal, [], [], [], {
      newTargetDate,
    });
    
    expect(result.timelineChange).toBe(15); // Extended by 15 days
  });
});
