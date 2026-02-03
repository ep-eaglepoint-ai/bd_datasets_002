/**
 * Dependency Validation Tests - validates circular dependency detection, deadlock detection, and graph analysis
 */

import { v4 as uuidv4 } from 'uuid';
import {
  buildDependencyGraph,
  detectCircularDependencies,
  wouldCreateCircularDependency,
  detectDeadlocks,
  detectCascadingDelays,
  analyzeBlockedItems,
  validateDependencies,
  canMarkComplete,
  getExecutionOrder,
  getCriticalPath,
} from '@/lib/dependencies';
import { Goal, Milestone, Dependency } from '@/lib/types';

// Helper to create a test goal
function createTestGoal(id: string, state: string = 'active'): Goal {
  return {
    id,
    title: `Goal ${id.slice(0, 4)}`,
    priority: 'medium',
    priorityWeight: 50,
    state: state as Goal['state'],
    progress: 0,
    successCriteria: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create a test milestone
function createTestMilestone(id: string, goalId: string, state: string = 'active'): Milestone {
  return {
    id,
    goalId,
    title: `Milestone ${id.slice(0, 4)}`,
    priority: 'medium',
    state: state as Milestone['state'],
    progress: 0,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create a test dependency
function createTestDependency(
  sourceId: string,
  targetId: string,
  dependencyType: 'blocks' | 'requires' | 'soft_dependency' = 'blocks',
  sourceType: 'goal' | 'milestone' = 'goal',
  targetType: 'goal' | 'milestone' = 'goal'
): Dependency {
  return {
    id: uuidv4(),
    sourceId,
    targetId,
    sourceType,
    targetType,
    dependencyType,
    createdAt: new Date().toISOString(),
  };
}

describe('Dependency Graph Building', () => {
  test('should build empty graph with no entities', () => {
    const graph = buildDependencyGraph([], [], []);
    
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.size).toBe(0);
  });

  test('should add goals as nodes', () => {
    const goals = [
      createTestGoal('goal-1'),
      createTestGoal('goal-2'),
    ];
    
    const graph = buildDependencyGraph(goals, [], []);
    
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.has('goal-1')).toBe(true);
    expect(graph.nodes.has('goal-2')).toBe(true);
  });

  test('should add milestones as nodes', () => {
    const goals = [createTestGoal('goal-1')];
    const milestones = [
      createTestMilestone('milestone-1', 'goal-1'),
      createTestMilestone('milestone-2', 'goal-1'),
    ];
    
    const graph = buildDependencyGraph(goals, milestones, []);
    
    expect(graph.nodes.size).toBe(3);
    expect(graph.nodes.has('milestone-1')).toBe(true);
    expect(graph.nodes.has('milestone-2')).toBe(true);
  });

  test('should add dependencies as edges', () => {
    const goals = [
      createTestGoal('goal-1'),
      createTestGoal('goal-2'),
    ];
    const dependencies = [
      createTestDependency('goal-1', 'goal-2'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    
    const edges = graph.edges.get('goal-1');
    expect(edges).toContain('goal-2');
  });
});

describe('Circular Dependency Detection', () => {
  test('should detect no cycle in acyclic graph', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
      createTestGoal('C'),
    ];
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'C'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = detectCircularDependencies(graph);
    
    expect(result.hasCircle).toBe(false);
  });

  test('should detect simple cycle (A -> B -> A)', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
    ];
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'A'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = detectCircularDependencies(graph);
    
    expect(result.hasCircle).toBe(true);
    expect(result.path).toBeDefined();
  });

  test('should detect complex cycle (A -> B -> C -> A)', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
      createTestGoal('C'),
    ];
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'C'),
      createTestDependency('C', 'A'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = detectCircularDependencies(graph);
    
    expect(result.hasCircle).toBe(true);
  });

  test('should detect if new dependency would create cycle', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
      createTestGoal('C'),
    ];
    // A -> B -> C (no cycle)
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'C'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    
    // Adding C -> A would create cycle
    expect(wouldCreateCircularDependency(graph, 'C', 'A')).toBe(true);
    
    // Adding A -> C would not create cycle
    expect(wouldCreateCircularDependency(graph, 'A', 'C')).toBe(false);
  });
});

describe('Deadlock Detection', () => {
  test('should not detect deadlock in simple chain', () => {
    const goals = [
      createTestGoal('A', 'planned'),
      createTestGoal('B', 'planned'),
    ];
    const dependencies = [
      createTestDependency('A', 'B'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = detectDeadlocks(graph, dependencies);
    
    expect(result.hasDeadlock).toBe(false);
    expect(result.deadlockedItems).toHaveLength(0);
  });

  test('should detect mutual blocking (A blocks B, B blocks A)', () => {
    const goals = [
      createTestGoal('A', 'active'),
      createTestGoal('B', 'active'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
      createTestDependency('B', 'A', 'blocks'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = detectDeadlocks(graph, dependencies);
    
    expect(result.hasDeadlock).toBe(true);
    expect(result.deadlockedItems).toContain('A');
    expect(result.deadlockedItems).toContain('B');
  });

  test('should not flag completed items as deadlocked', () => {
    const goals = [
      createTestGoal('A', 'completed'),
      createTestGoal('B', 'active'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
      createTestDependency('B', 'A', 'blocks'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = detectDeadlocks(graph, dependencies);
    
    expect(result.hasDeadlock).toBe(false);
  });
});

describe('Blocked Items Analysis', () => {
  test('should identify blocked items', () => {
    const goals = [
      createTestGoal('A', 'active'),
      createTestGoal('B', 'active'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const blockedItems = analyzeBlockedItems(graph, dependencies);
    
    expect(blockedItems.length).toBe(1);
    expect(blockedItems[0].itemId).toBe('A');
    expect(blockedItems[0].blockedBy.length).toBe(1);
    expect(blockedItems[0].blockedBy[0].id).toBe('B');
  });

  test('should not flag items blocked by completed dependencies', () => {
    const goals = [
      createTestGoal('A', 'active'),
      createTestGoal('B', 'completed'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const blockedItems = analyzeBlockedItems(graph, dependencies);
    
    expect(blockedItems.length).toBe(0);
  });
});

describe('Cascading Delays Detection', () => {
  test('should detect cascading delays', () => {
    const goals = [
      createTestGoal('A', 'active'), // Blocker
      createTestGoal('B', 'active'), // Blocked by A
      createTestGoal('C', 'active'), // Blocked by B
    ];
    const dependencies = [
      createTestDependency('B', 'A'),
      createTestDependency('C', 'B'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const delays = detectCascadingDelays(graph, dependencies);
    
    // A causes delays to B and C
    const aDelays = delays.find(d => d.sourceId === 'A');
    expect(aDelays).toBeDefined();
    expect(aDelays?.affectedItems.length).toBeGreaterThan(0);
  });
});

describe('Complete Dependency Validation', () => {
  test('should validate clean dependency graph', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
      createTestGoal('C'),
    ];
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'C'),
    ];
    
    const result = validateDependencies(goals, [], dependencies);
    
    expect(result.isValid).toBe(true);
    expect(result.hasCircularDependency).toBe(false);
    expect(result.hasDeadlock).toBe(false);
  });

  test('should detect and report all issues', () => {
    const goals = [
      createTestGoal('A', 'active'),
      createTestGoal('B', 'active'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
      createTestDependency('B', 'A', 'blocks'),
    ];
    
    const result = validateDependencies(goals, [], dependencies);
    
    expect(result.isValid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

describe('Completion Check', () => {
  test('should allow completion when no blocking dependencies', () => {
    const goals = [createTestGoal('A')];
    const graph = buildDependencyGraph(goals, [], []);
    
    const result = canMarkComplete('A', graph, []);
    
    expect(result.canComplete).toBe(true);
    expect(result.blockingItems).toHaveLength(0);
  });

  test('should block completion when dependencies incomplete', () => {
    const goals = [
      createTestGoal('A', 'active'),
      createTestGoal('B', 'active'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = canMarkComplete('A', graph, dependencies);
    
    expect(result.canComplete).toBe(false);
    expect(result.blockingItems).toContain(`Goal B`);
  });

  test('should allow completion when dependencies are completed', () => {
    const goals = [
      createTestGoal('A', 'active'),
      createTestGoal('B', 'completed'),
    ];
    const dependencies = [
      createTestDependency('A', 'B', 'blocks'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = canMarkComplete('A', graph, dependencies);
    
    expect(result.canComplete).toBe(true);
  });
});

describe('Execution Order', () => {
  test('should return empty order for empty graph', () => {
    const graph = buildDependencyGraph([], [], []);
    const order = getExecutionOrder(graph);
    
    expect(order).toHaveLength(0);
  });

  test('should return topological order', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
      createTestGoal('C'),
    ];
    // A depends on B, B depends on C
    // Order should be: C, B, A
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'C'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const order = getExecutionOrder(graph);
    
    expect(order).toHaveLength(3);
    // C should come before B, B should come before A
    expect(order.indexOf('C')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('A'));
  });
});

describe('Critical Path', () => {
  test('should return single node for isolated item', () => {
    const goals = [createTestGoal('A')];
    const graph = buildDependencyGraph(goals, [], []);
    
    const result = getCriticalPath(graph);
    
    expect(result.path).toHaveLength(1);
    expect(result.length).toBe(1);
  });

  test('should find longest dependency chain', () => {
    const goals = [
      createTestGoal('A'),
      createTestGoal('B'),
      createTestGoal('C'),
      createTestGoal('D'),
    ];
    // Longest path: A -> B -> C (length 3)
    // D is isolated (length 1)
    const dependencies = [
      createTestDependency('A', 'B'),
      createTestDependency('B', 'C'),
    ];
    
    const graph = buildDependencyGraph(goals, [], dependencies);
    const result = getCriticalPath(graph);
    
    expect(result.length).toBe(3);
    expect(result.path).toContain('A');
    expect(result.path).toContain('B');
    expect(result.path).toContain('C');
  });
});
