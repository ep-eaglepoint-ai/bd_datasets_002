import { v4 as uuidv4 } from 'uuid';
import { Goal, Milestone, ProgressUpdate, Dependency } from '@/lib/types';
import { useGoalStore } from '@/lib/store';

// Mock DB for performance testing
jest.mock('@/lib/db', () => ({
  getAllGoals: jest.fn().mockResolvedValue([]),
  getAllMilestones: jest.fn().mockResolvedValue([]),
  getAllProgressUpdates: jest.fn().mockResolvedValue([]),
  getAllDependencies: jest.fn().mockResolvedValue([]),
  saveGoal: jest.fn(),
  saveMilestone: jest.fn(),
  saveProgressUpdate: jest.fn(),
  saveDependency: jest.fn(),
  saveVersionSnapshot: jest.fn(),
  getLatestVersion: jest.fn().mockResolvedValue(1),
}));

// Helper to generate test data - using type assertions for test data
function generateGoals(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: uuidv4(),
    title: `Goal ${i + 1}`,
    description: `Description for goal ${i + 1}`,
    progress: Math.floor(Math.random() * 100),
    priority: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as 'low' | 'medium' | 'high' | 'critical',
    priorityWeight: Math.floor(Math.random() * 100),
    state: ['planned', 'active', 'completed'][Math.floor(Math.random() * 3)] as 'planned' | 'active' | 'completed',
    tags: [`tag${i % 5}`, `category${i % 3}`],
    successCriteria: [],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function generateMilestones(goals: ReturnType<typeof generateGoals>, milestonesPerGoal: number) {
  const milestones: Array<{
    id: string;
    goalId: string;
    title: string;
    description: string;
    progress: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    order: number;
    state: 'planned' | 'active' | 'completed';
    createdAt: string;
    updatedAt: string;
  }> = [];
  goals.forEach(goal => {
    for (let i = 0; i < milestonesPerGoal; i++) {
      milestones.push({
        id: uuidv4(),
        goalId: goal.id,
        title: `Milestone ${i + 1} for ${goal.title}`,
        description: `Description`,
        progress: Math.floor(Math.random() * 100),
        priority: 'medium',
        order: i,
        state: ['planned', 'active', 'completed'][Math.floor(Math.random() * 3)] as 'planned' | 'active' | 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
  return milestones;
}

function generateProgressUpdates(goals: ReturnType<typeof generateGoals>, updatesPerGoal: number) {
  const updates: Array<{
    id: string;
    entityId: string;
    entityType: 'goal';
    percentage: number;
    notes: string;
    blockers: string[];
    createdAt: string;
  }> = [];
  goals.forEach(goal => {
    for (let i = 0; i < updatesPerGoal; i++) {
      updates.push({
        id: uuidv4(),
        entityId: goal.id,
        entityType: 'goal',
        percentage: Math.floor(Math.random() * 100),
        notes: `Update ${i + 1}`,
        blockers: [],
        createdAt: new Date(Date.now() - (updatesPerGoal - i) * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });
  return updates;
}

describe('Extreme Scale Tests', () => {
  beforeEach(() => {
    useGoalStore.setState({
      goals: [],
      milestones: [],
      dependencies: [],
      progressUpdates: [],
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('Large Dataset Handling', () => {
    test('should handle 1000 goals without timeout', () => {
      const startTime = performance.now();
      const goals = generateGoals(1000);
      const generateTime = performance.now() - startTime;
      
      expect(goals.length).toBe(1000);
      expect(generateTime).toBeLessThan(5000); // Should generate in under 5 seconds
    });

    test('should filter 1000 goals efficiently', () => {
      const goals = generateGoals(1000);
      
      const startTime = performance.now();
      
      // Filter active high-priority goals
      const filtered = goals.filter(g => 
        g.state === 'active' && 
        (g.priority === 'high' || g.priority === 'critical')
      );
      
      const filterTime = performance.now() - startTime;
      
      expect(filterTime).toBeLessThan(100); // Should filter in under 100ms
      expect(filtered.length).toBeLessThanOrEqual(goals.length);
    });

    test('should sort 1000 goals efficiently', () => {
      const goals = generateGoals(1000);
      
      const startTime = performance.now();
      
      const sorted = [...goals].sort((a, b) => {
        // Sort by priority weight descending, then by progress ascending
        if (b.priorityWeight !== a.priorityWeight) {
          return b.priorityWeight - a.priorityWeight;
        }
        return a.progress - b.progress;
      });
      
      const sortTime = performance.now() - startTime;
      
      expect(sortTime).toBeLessThan(100); // Should sort in under 100ms
      expect(sorted.length).toBe(1000);
    });
  });

  describe('Memory Usage', () => {
    test('should not exceed reasonable memory for 1000 goals with milestones', () => {
      const goals = generateGoals(1000);
      const milestones = generateMilestones(goals, 5); // 5000 milestones
      const updates = generateProgressUpdates(goals, 10); // 10000 updates
      
      // Calculate approximate memory usage
      const goalsSize = JSON.stringify(goals).length;
      const milestonesSize = JSON.stringify(milestones).length;
      const updatesSize = JSON.stringify(updates).length;
      const totalSize = goalsSize + milestonesSize + updatesSize;
      
      // Convert to MB
      const sizeMB = totalSize / (1024 * 1024);
      
      // Should be under 50MB for serialized data
      expect(sizeMB).toBeLessThan(50);
      expect(milestones.length).toBe(5000);
      expect(updates.length).toBe(10000);
    });
  });

  describe('Analytics Computation at Scale', () => {
    test('should compute velocity for 1000 goals efficiently', () => {
      const goals = generateGoals(1000);
      const updates = generateProgressUpdates(goals, 10);
      
      const startTime = performance.now();
      
      const velocities = goals.map(goal => {
        const goalUpdates = updates
          .filter(u => u.entityId === goal.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        if (goalUpdates.length < 2) return 0;
        
        const first = goalUpdates[0];
        const last = goalUpdates[goalUpdates.length - 1];
        const days = Math.max(1, (new Date(last.createdAt).getTime() - new Date(first.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        
        return (last.percentage - first.percentage) / days;
      });
      
      const computeTime = performance.now() - startTime;
      
      expect(computeTime).toBeLessThan(2000); // Should compute in under 2 seconds
      expect(velocities.length).toBe(1000);
    });

    test('should aggregate statistics for 1000 goals efficiently', () => {
      const goals = generateGoals(1000);
      
      const startTime = performance.now();
      
      const stats = {
        total: goals.length,
        completed: goals.filter(g => g.state === 'completed').length,
        active: goals.filter(g => g.state === 'active').length,
        planned: goals.filter(g => g.state === 'planned').length,
        averageProgress: goals.reduce((sum, g) => sum + g.progress, 0) / goals.length,
        byPriority: {
          critical: goals.filter(g => g.priority === 'critical').length,
          high: goals.filter(g => g.priority === 'high').length,
          medium: goals.filter(g => g.priority === 'medium').length,
          low: goals.filter(g => g.priority === 'low').length,
        },
      };
      
      const aggregateTime = performance.now() - startTime;
      
      expect(aggregateTime).toBeLessThan(100); // Should aggregate in under 100ms
      expect(stats.total).toBe(1000);
    });
  });

  describe('Dependency Graph at Scale', () => {
    test('should build dependency graph for 500 connected goals', () => {
      const goals = generateGoals(500);
      
      // Create chain dependencies (each goal depends on previous)
      const dependencies: Array<{
        id: string;
        sourceId: string;
        targetId: string;
        sourceType: 'goal';
        targetType: 'goal';
        dependencyType: 'blocks';
        createdAt: string;
        updatedAt: string;
      }> = [];
      for (let i = 1; i < goals.length; i++) {
        dependencies.push({
          id: uuidv4(),
          sourceId: goals[i].id,
          targetId: goals[i - 1].id,
          sourceType: 'goal',
          targetType: 'goal',
          dependencyType: 'blocks',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      const startTime = performance.now();
      
      // Build adjacency list
      const graph = new Map<string, string[]>();
      goals.forEach(g => graph.set(g.id, []));
      dependencies.forEach(d => {
        const existing = graph.get(d.sourceId) || [];
        existing.push(d.targetId);
        graph.set(d.sourceId, existing);
      });
      
      const buildTime = performance.now() - startTime;
      
      expect(buildTime).toBeLessThan(500); // Should build in under 500ms
      expect(graph.size).toBe(500);
      expect(dependencies.length).toBe(499);
    });
  });

  describe('Search Performance', () => {
    test('should search 1000 goals by title efficiently', () => {
      const goals = generateGoals(1000);
      const searchTerm = 'Goal 50';
      
      const startTime = performance.now();
      
      const results = goals.filter(g => 
        g.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const searchTime = performance.now() - startTime;
      
      expect(searchTime).toBeLessThan(50); // Should search in under 50ms
      expect(results.length).toBeGreaterThan(0);
    });

    test('should search across multiple fields efficiently', () => {
      const goals = generateGoals(1000);
      const searchTerm = 'tag2';
      
      const startTime = performance.now();
      
      const results = goals.filter(g => 
        g.title.toLowerCase().includes(searchTerm) ||
        g.description?.toLowerCase().includes(searchTerm) ||
        g.tags.some(t => t.toLowerCase().includes(searchTerm))
      );
      
      const searchTime = performance.now() - startTime;
      
      expect(searchTime).toBeLessThan(100); // Should search in under 100ms
    });
  });
});
