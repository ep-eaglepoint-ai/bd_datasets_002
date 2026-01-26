// Dependency Validation Engine
// Detects circular dependencies, deadlocks, and provides diagnostics

import { Dependency, Goal, Milestone } from './types';

// ============================================================================
// Types
// ============================================================================

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, string[]>;
}

export interface DependencyNode {
  id: string;
  type: 'goal' | 'milestone';
  state: string;
  title: string;
}

export interface DependencyValidationResult {
  isValid: boolean;
  hasCircularDependency: boolean;
  circularPath?: string[];
  hasDeadlock: boolean;
  deadlockedItems?: string[];
  blockedItems: BlockedItemInfo[];
  cascadingDelays: CascadingDelayInfo[];
  diagnostics: string[];
}

export interface BlockedItemInfo {
  itemId: string;
  itemTitle: string;
  blockedBy: {
    id: string;
    title: string;
    state: string;
  }[];
}

export interface CascadingDelayInfo {
  sourceId: string;
  sourceTitle: string;
  affectedItems: {
    id: string;
    title: string;
    delayPropagation: number; // How many levels deep
  }[];
}

// ============================================================================
// Graph Building
// ============================================================================

/**
 * Builds a dependency graph from goals, milestones, and dependencies
 */
export function buildDependencyGraph(
  goals: Goal[],
  milestones: Milestone[],
  dependencies: Dependency[]
): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges = new Map<string, string[]>();
  
  // Add goal nodes
  for (const goal of goals) {
    nodes.set(goal.id, {
      id: goal.id,
      type: 'goal',
      state: goal.state,
      title: goal.title,
    });
    edges.set(goal.id, []);
  }
  
  // Add milestone nodes
  for (const milestone of milestones) {
    nodes.set(milestone.id, {
      id: milestone.id,
      type: 'milestone',
      state: milestone.state,
      title: milestone.title,
    });
    edges.set(milestone.id, []);
  }
  
  // Add edges (source depends on target)
  for (const dep of dependencies) {
    const sourceEdges = edges.get(dep.sourceId) || [];
    sourceEdges.push(dep.targetId);
    edges.set(dep.sourceId, sourceEdges);
  }
  
  return { nodes, edges };
}

// ============================================================================
// Circular Dependency Detection
// ============================================================================

/**
 * Detects circular dependencies using DFS
 */
export function detectCircularDependencies(
  graph: DependencyGraph
): { hasCircle: boolean; path?: string[] } {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = graph.edges.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract the cycle path
        const cycleStart = path.indexOf(neighbor);
        path.push(neighbor);
        return true;
      }
    }
    
    path.pop();
    recursionStack.delete(nodeId);
    return false;
  }
  
  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) {
        // Find where the cycle starts in the path
        const cycleStart = path.findIndex((id, index) => 
          index < path.length - 1 && path.lastIndexOf(id) > index
        );
        
        if (cycleStart >= 0) {
          const cyclePath = path.slice(cycleStart);
          return { hasCircle: true, path: cyclePath };
        }
        return { hasCircle: true, path };
      }
    }
  }
  
  return { hasCircle: false };
}

/**
 * Checks if adding a new dependency would create a circular dependency
 */
export function wouldCreateCircularDependency(
  graph: DependencyGraph,
  sourceId: string,
  targetId: string
): boolean {
  // Check if there's already a path from target to source
  // If so, adding source -> target would create a cycle
  const visited = new Set<string>();
  
  function canReach(from: string, to: string): boolean {
    if (from === to) return true;
    if (visited.has(from)) return false;
    
    visited.add(from);
    const neighbors = graph.edges.get(from) || [];
    
    for (const neighbor of neighbors) {
      if (canReach(neighbor, to)) {
        return true;
      }
    }
    
    return false;
  }
  
  return canReach(targetId, sourceId);
}

// ============================================================================
// Deadlock Detection
// ============================================================================

/**
 * Detects deadlock situations where items are mutually blocked
 */
export function detectDeadlocks(
  graph: DependencyGraph,
  dependencies: Dependency[]
): { hasDeadlock: boolean; deadlockedItems: string[] } {
  const deadlockedItems: string[] = [];
  
  // Find items that are blocked by incomplete items, where those items are also blocked
  for (const [nodeId, node] of graph.nodes) {
    if (node.state === 'completed' || node.state === 'failed' || node.state === 'abandoned') {
      continue;
    }
    
    const blockingItems = getBlockingItems(nodeId, graph, dependencies);
    
    for (const blockerId of blockingItems) {
      const blockerBlockers = getBlockingItems(blockerId, graph, dependencies);
      
      // If the blocker is also blocked by this item (or items blocked by this item),
      // we have a deadlock
      if (blockerBlockers.includes(nodeId)) {
        if (!deadlockedItems.includes(nodeId)) {
          deadlockedItems.push(nodeId);
        }
        if (!deadlockedItems.includes(blockerId)) {
          deadlockedItems.push(blockerId);
        }
      }
    }
  }
  
  return {
    hasDeadlock: deadlockedItems.length > 0,
    deadlockedItems,
  };
}

/**
 * Gets all items that are blocking a given item
 */
function getBlockingItems(
  itemId: string,
  graph: DependencyGraph,
  dependencies: Dependency[]
): string[] {
  const blockers: string[] = [];
  
  const itemDeps = dependencies.filter(d => 
    d.sourceId === itemId && 
    (d.dependencyType === 'blocks' || d.dependencyType === 'requires')
  );
  
  for (const dep of itemDeps) {
    const targetNode = graph.nodes.get(dep.targetId);
    if (targetNode && targetNode.state !== 'completed') {
      blockers.push(dep.targetId);
    }
  }
  
  return blockers;
}

// ============================================================================
// Cascading Delay Detection
// ============================================================================

/**
 * Detects cascading delays from upstream items
 */
export function detectCascadingDelays(
  graph: DependencyGraph,
  dependencies: Dependency[]
): CascadingDelayInfo[] {
  const delays: CascadingDelayInfo[] = [];
  
  // Find all incomplete items that have dependents
  for (const [nodeId, node] of graph.nodes) {
    if (node.state === 'completed') continue;
    
    // Find all items that depend on this one
    const dependents = dependencies.filter(d => d.targetId === nodeId);
    
    if (dependents.length === 0) continue;
    
    // Calculate cascading effect
    const affected = new Map<string, number>(); // id -> propagation level
    
    function findAffected(currentId: string, level: number) {
      const directDependents = dependencies.filter(d => d.targetId === currentId);
      
      for (const dep of directDependents) {
        const existingLevel = affected.get(dep.sourceId);
        if (existingLevel === undefined || level < existingLevel) {
          affected.set(dep.sourceId, level);
          findAffected(dep.sourceId, level + 1);
        }
      }
    }
    
    findAffected(nodeId, 1);
    
    if (affected.size > 0) {
      const affectedItems = Array.from(affected.entries()).map(([id, level]) => {
        const affectedNode = graph.nodes.get(id);
        return {
          id,
          title: affectedNode?.title || 'Unknown',
          delayPropagation: level,
        };
      });
      
      delays.push({
        sourceId: nodeId,
        sourceTitle: node.title,
        affectedItems,
      });
    }
  }
  
  return delays;
}

// ============================================================================
// Blocked Items Analysis
// ============================================================================

/**
 * Analyzes which items are currently blocked and by what
 */
export function analyzeBlockedItems(
  graph: DependencyGraph,
  dependencies: Dependency[]
): BlockedItemInfo[] {
  const blockedItems: BlockedItemInfo[] = [];
  
  for (const [nodeId, node] of graph.nodes) {
    // Skip completed/failed/abandoned items
    if (['completed', 'failed', 'abandoned'].includes(node.state)) {
      continue;
    }
    
    // Find blocking dependencies for this item
    const blockingDeps = dependencies.filter(d => 
      d.sourceId === nodeId && 
      (d.dependencyType === 'blocks' || d.dependencyType === 'requires')
    );
    
    const blockers: { id: string; title: string; state: string }[] = [];
    
    for (const dep of blockingDeps) {
      const targetNode = graph.nodes.get(dep.targetId);
      if (targetNode && targetNode.state !== 'completed') {
        blockers.push({
          id: dep.targetId,
          title: targetNode.title,
          state: targetNode.state,
        });
      }
    }
    
    if (blockers.length > 0) {
      blockedItems.push({
        itemId: nodeId,
        itemTitle: node.title,
        blockedBy: blockers,
      });
    }
  }
  
  return blockedItems;
}

// ============================================================================
// Complete Validation
// ============================================================================

/**
 * Performs complete dependency validation and returns diagnostics
 */
export function validateDependencies(
  goals: Goal[],
  milestones: Milestone[],
  dependencies: Dependency[]
): DependencyValidationResult {
  const diagnostics: string[] = [];
  
  // Build graph
  const graph = buildDependencyGraph(goals, milestones, dependencies);
  
  // Check for circular dependencies
  const circularCheck = detectCircularDependencies(graph);
  if (circularCheck.hasCircle && circularCheck.path) {
    const pathTitles = circularCheck.path.map(id => {
      const node = graph.nodes.get(id);
      return node?.title || id;
    });
    diagnostics.push(`Circular dependency detected: ${pathTitles.join(' → ')}`);
  }
  
  // Check for deadlocks
  const deadlockCheck = detectDeadlocks(graph, dependencies);
  if (deadlockCheck.hasDeadlock) {
    const deadlockedTitles = deadlockCheck.deadlockedItems.map(id => {
      const node = graph.nodes.get(id);
      return node?.title || id;
    });
    diagnostics.push(`Deadlock detected among: ${deadlockedTitles.join(', ')}`);
  }
  
  // Analyze blocked items
  const blockedItems = analyzeBlockedItems(graph, dependencies);
  for (const blocked of blockedItems) {
    const blockerList = blocked.blockedBy.map(b => b.title).join(', ');
    diagnostics.push(`"${blocked.itemTitle}" is blocked by: ${blockerList}`);
  }
  
  // Detect cascading delays
  const cascadingDelays = detectCascadingDelays(graph, dependencies);
  for (const delay of cascadingDelays) {
    if (delay.affectedItems.length > 2) {
      diagnostics.push(
        `"${delay.sourceTitle}" is causing delays in ${delay.affectedItems.length} downstream items`
      );
    }
  }
  
  return {
    isValid: !circularCheck.hasCircle && !deadlockCheck.hasDeadlock,
    hasCircularDependency: circularCheck.hasCircle,
    circularPath: circularCheck.path,
    hasDeadlock: deadlockCheck.hasDeadlock,
    deadlockedItems: deadlockCheck.deadlockedItems,
    blockedItems,
    cascadingDelays,
    diagnostics,
  };
}

// ============================================================================
// Dependency Management Helpers
// ============================================================================

/**
 * Checks if an item can be marked as complete (all dependencies satisfied)
 */
export function canMarkComplete(
  itemId: string,
  graph: DependencyGraph,
  dependencies: Dependency[]
): { canComplete: boolean; blockingItems: string[] } {
  const blockingDeps = dependencies.filter(d => 
    d.sourceId === itemId && 
    (d.dependencyType === 'blocks' || d.dependencyType === 'requires')
  );
  
  const blockingItems: string[] = [];
  
  for (const dep of blockingDeps) {
    const targetNode = graph.nodes.get(dep.targetId);
    if (targetNode && targetNode.state !== 'completed') {
      blockingItems.push(targetNode.title);
    }
  }
  
  return {
    canComplete: blockingItems.length === 0,
    blockingItems,
  };
}

/**
 * Gets topologically sorted order for execution (respecting dependencies)
 */
export function getExecutionOrder(
  graph: DependencyGraph
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];
  
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const dependencies = graph.edges.get(nodeId) || [];
    for (const depId of dependencies) {
      visit(depId);
    }
    
    order.push(nodeId);
  }
  
  for (const nodeId of graph.nodes.keys()) {
    visit(nodeId);
  }
  
  return order;
}

/**
 * Calculates the critical path (longest chain of dependencies)
 */
export function getCriticalPath(
  graph: DependencyGraph
): { path: string[]; length: number } {
  const memo = new Map<string, { path: string[]; length: number }>();
  
  function findLongestPath(nodeId: string): { path: string[]; length: number } {
    if (memo.has(nodeId)) {
      return memo.get(nodeId)!;
    }
    
    const deps = graph.edges.get(nodeId) || [];
    
    if (deps.length === 0) {
      const result = { path: [nodeId], length: 1 };
      memo.set(nodeId, result);
      return result;
    }
    
    let longestPath: string[] = [];
    let maxLength = 0;
    
    for (const depId of deps) {
      const subPath = findLongestPath(depId);
      if (subPath.length > maxLength) {
        maxLength = subPath.length;
        longestPath = subPath.path;
      }
    }
    
    const result = { path: [nodeId, ...longestPath], length: maxLength + 1 };
    memo.set(nodeId, result);
    return result;
  }
  
  let criticalPath: string[] = [];
  let maxLength = 0;
  
  for (const nodeId of graph.nodes.keys()) {
    const result = findLongestPath(nodeId);
    if (result.length > maxLength) {
      maxLength = result.length;
      criticalPath = result.path;
    }
  }
  
  return { path: criticalPath, length: maxLength };
}
