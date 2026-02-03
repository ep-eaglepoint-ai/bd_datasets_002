import { filterGoals } from '../app/lib/store';
import { Goal, GoalFilter, Milestone, ProgressUpdate, Dependency } from '../app/lib/types';
import { useGoalStore } from '../app/lib/store';

const mockGoal1 = {
  id: 'g1', title: 'Risk Goal', state: 'active', priority: 'high', progress: 0, 
  createdAt: new Date(Date.now() - 86400000 * 20).toISOString(), tags: [], updatedAt: new Date().toISOString()
} as unknown as Goal;

const mockGoal2 = {
  id: 'g2', title: 'Blocked Goal', state: 'active', priority: 'medium', progress: 50,
  createdAt: new Date().toISOString(), tags: [], updatedAt: new Date().toISOString()
} as unknown as Goal;

const mockGoals = [mockGoal1, mockGoal2];

// g2 is blocked by g1 (g1 is source, g2 is target).
// Store check: blocked = dependencies.some(d => d.targetId === goal.id && dependencyType === 'blocks')
const mockDependencies: Dependency[] = [
    { id: 'd1', sourceId: 'g1', targetId: 'g2', dependencyType: 'blocks', sourceType:'goal', targetType:'goal', createdAt: new Date().toISOString() }
]; 

describe('Advanced Filters', () => {
    test('filters by Critical Risk (Blocked)', () => {
       const filtered = filterGoals(mockGoals, { riskLevel: 'critical' }, { 
           milestones: [], 
           updates: [], 
           dependencies: mockDependencies 
       });
       expect(filtered).toHaveLength(1);
       expect(filtered[0].id).toBe('g2'); // g2 is blocked
    });

    test('filters by High Risk (Stagnant & Active)', () => {
       const filtered = filterGoals(mockGoals, { riskLevel: 'high' }, { 
           milestones: [], 
           updates: [], 
           dependencies: mockDependencies 
       });
       expect(filtered).toHaveLength(1);
       expect(filtered[0].id).toBe('g1'); // g1 is stagnant (old, no progress)
    });
});
