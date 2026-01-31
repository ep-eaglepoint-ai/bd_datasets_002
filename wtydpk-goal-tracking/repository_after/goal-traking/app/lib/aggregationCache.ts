// Incremental Aggregation Cache
// Caches computed analytics and updates incrementally

import { Goal, Milestone, ProgressUpdate } from './types';

interface AggregatedMetrics {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  overallProgress: number;
  averageVelocity: number;
  totalMilestones: number;
  completedMilestones: number;
  lastUpdated: string;
}

interface GoalMetrics {
  velocity: number;
  prediction: number;
  lastProgress: number;
  updateCount: number;
}

class IncrementalAggregationCache {
  private aggregated: AggregatedMetrics | null = null;
  private goalMetrics: Map<string, GoalMetrics> = new Map();
  private dirty: boolean = true;

  // Mark cache as needing recalculation
  invalidate() {
    this.dirty = true;
  }

  invalidateGoal(goalId: string) {
    this.goalMetrics.delete(goalId);
    this.dirty = true;
  }

  // Get cached aggregated metrics or compute if dirty
  getAggregatedMetrics(
    goals: Goal[],
    milestones: Milestone[],
    updates: ProgressUpdate[]
  ): AggregatedMetrics {
    if (!this.dirty && this.aggregated) {
      return this.aggregated;
    }

    const completedGoals = goals.filter(g => g.state === 'completed').length;
    const activeGoals = goals.filter(g => g.state === 'active').length;
    const overallProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
      : 0;

    // Compute velocities for all goals
    let totalVelocity = 0;
    let velocityCount = 0;
    
    for (const goal of goals) {
      const cached = this.goalMetrics.get(goal.id);
      if (cached) {
        totalVelocity += cached.velocity;
        velocityCount++;
      } else {
        const goalUpdates = updates.filter(u => u.entityId === goal.id);
        if (goalUpdates.length >= 2) {
          const first = goalUpdates[0];
          const last = goalUpdates[goalUpdates.length - 1];
          const days = Math.max(1, (new Date(last.createdAt).getTime() - new Date(first.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          const velocity = (last.percentage - first.percentage) / days;
          
          this.goalMetrics.set(goal.id, {
            velocity,
            prediction: 50,
            lastProgress: goal.progress,
            updateCount: goalUpdates.length,
          });
          
          totalVelocity += velocity;
          velocityCount++;
        }
      }
    }

    const completedMilestones = milestones.filter(m => m.state === 'completed').length;

    this.aggregated = {
      totalGoals: goals.length,
      completedGoals,
      activeGoals,
      overallProgress: Math.round(overallProgress),
      averageVelocity: velocityCount > 0 ? Math.round((totalVelocity / velocityCount) * 100) / 100 : 0,
      totalMilestones: milestones.length,
      completedMilestones,
      lastUpdated: new Date().toISOString(),
    };

    this.dirty = false;
    return this.aggregated;
  }

  // Incrementally update when a single goal changes
  updateGoalMetric(goalId: string, progress: number, velocity?: number) {
    const existing = this.goalMetrics.get(goalId);
    if (existing) {
      this.goalMetrics.set(goalId, {
        ...existing,
        lastProgress: progress,
        velocity: velocity ?? existing.velocity,
        updateCount: existing.updateCount + 1,
      });
    }
    // Don't invalidate entire cache, just update aggregated values
    if (this.aggregated) {
      this.dirty = true;
    }
  }

  // Get cached metric for a specific goal
  getGoalMetric(goalId: string): GoalMetrics | undefined {
    return this.goalMetrics.get(goalId);
  }

  // Clear entire cache
  clear() {
    this.aggregated = null;
    this.goalMetrics.clear();
    this.dirty = true;
  }
}

// Singleton instance
let cacheInstance: IncrementalAggregationCache | null = null;

export function getAggregationCache(): IncrementalAggregationCache {
  if (!cacheInstance) {
    cacheInstance = new IncrementalAggregationCache();
  }
  return cacheInstance;
}

export function resetAggregationCache() {
  cacheInstance?.clear();
  cacheInstance = null;
}

export { IncrementalAggregationCache };
export type { AggregatedMetrics, GoalMetrics };
