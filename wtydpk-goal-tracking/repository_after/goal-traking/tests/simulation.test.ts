import { simulateChanges } from '../app/lib/analytics';
import { filterGoals } from '../app/lib/store'; // Note: export might need ensuring
import { Goal, Milestone, ProgressUpdate, Dependency } from '../app/lib/types';

// Mock with correct types
const mockGoal = {
  id: 'g1',
  title: 'Test Goal',
  state: 'active',
  priority: 'high',
  priorityWeight: 50,
  progress: 50,
  createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  updatedAt: new Date().toISOString(),
  tags: [],
  // Target date 2 days from now - tight deadline
  targetDate: new Date(Date.now() + 86400000 * 2).toISOString(),
} as unknown as Goal;

const mockMilestones: Milestone[] = [];
const mockUpdates: ProgressUpdate[] = [
    // 5 days ago: 10%
    { id: 'u0', entityId: 'g1', entityType: 'goal', percentage: 10, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), blockers: [] },
    // Now: 50%
    // Velocity ~ 40% / 5 days = 8% per day
    { id: 'u1', entityId: 'g1', entityType: 'goal', percentage: 50, createdAt: new Date().toISOString(), blockers: [] }
] as unknown as ProgressUpdate[];

const mockDependencies: Dependency[] = [];

describe('Simulation Logic', () => {
  test('simulateChanges adjusts progress', () => {
    // Current Prob with 2 days left (req 25%/day > 8%/day) -> Low
    const resultOriginal = simulateChanges(
        mockGoal,
        mockMilestones,
        mockUpdates,
        mockDependencies as any,
        {} 
    );
    
    // Simulate jump to 90% progress (req 10% / 2 days = 5%/day < 8%/day) -> High
    const result = simulateChanges(
      mockGoal,
      mockMilestones,
      mockUpdates,
      mockDependencies as any,
      { newProgress: 90 }
    );
    // 90% progress is much closer to completion, prob should go up
    expect(result.simulatedProbability).toBeGreaterThan(resultOriginal.originalProbability || 0);
  });

  test('simulateChanges adjusts deadline', () => {
    // Original: 2 days left -> Low Prob (Req 25%/day)
    
    // Extend deadline to 20 days (Req 50% / 20 = 2.5%/day < 8%/day) -> High Prob
    const extendedDeadline = new Date(Date.now() + 86400000 * 20).toISOString();
    
    const result = simulateChanges(
      mockGoal,
      mockMilestones,
      mockUpdates,
      mockDependencies as any,
      { newTargetDate: extendedDeadline }
    );
    
    // Should be significantly higher
    expect(result.simulatedProbability).toBeGreaterThan(result.originalProbability || 0);
  });
});
