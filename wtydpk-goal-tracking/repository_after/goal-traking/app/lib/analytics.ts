// Analytics Engine for Goal Tracking Application
// Computes velocity metrics, estimation accuracy, outcome quality, and trend analysis

import { differenceInDays, differenceInHours, subDays, parseISO } from 'date-fns';
import {
  Goal,
  Milestone,
  ProgressUpdate,
  VelocityMetrics,
  EstimationAccuracy,
  OutcomeQualityScore,
  TrendAnalysis,
  GoalState,
} from './types';
import * as db from './db';

// ============================================================================
// Velocity Metrics
// ============================================================================

export interface VelocityComputationResult {
  progressPerDay: number;
  progressPerWeek: number;
  accelerationTrend: 'accelerating' | 'decelerating' | 'stable' | 'stagnant';
  lastActiveDate?: string;
  stagnationDays: number;
}

/**
 * Computes velocity metrics for a goal or milestone based on progress history
 */
/**
 * Computes velocity metrics for a goal or milestone based on progress history
 */
export function computeVelocity(
  entityId: string,
  progressUpdates: ProgressUpdate[],
  createdAt: string
): VelocityComputationResult {
  const updates = progressUpdates
    .filter(u => u.entityId === entityId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  const now = new Date();
  const created = parseISO(createdAt);
  const totalDays = Math.max(differenceInDays(now, created), 1);
  
  if (updates.length === 0) {
    return {
      progressPerDay: 0,
      progressPerWeek: 0,
      accelerationTrend: 'stagnant',
      stagnationDays: totalDays,
    };
  }
  
  const lastUpdate = updates[updates.length - 1];
  const lastActiveDate = lastUpdate.createdAt;
  const stagnationDays = differenceInDays(now, parseISO(lastActiveDate));
  
  // Calculate overall velocity (Average)
  const currentProgress = lastUpdate.percentage;
  
  // Enhanced: Filter out significant gaps (> 2 weeks without updates) to avoid underestimating velocity during active periods
  let activeDays = totalDays;
  if (updates.length > 1) {
    let gapDays = 0;
    for (let i = 1; i < updates.length; i++) {
        const diff = differenceInDays(parseISO(updates[i].createdAt), parseISO(updates[i-1].createdAt));
        if (diff > 14) {
            gapDays += (diff - 14); // Only count days beyond the 2-week threshold as separate gap
        }
    }
    // Also check gap from last update to now if > 14 days
    if (stagnationDays > 14) {
        gapDays += (stagnationDays - 14);
    }
    activeDays = Math.max(1, totalDays - gapDays);
  }

  const progressPerDay = currentProgress / activeDays;
  const progressPerWeek = progressPerDay * 7;
  
  // Calculate acceleration trend by comparing recent vs earlier velocity
  let accelerationTrend: 'accelerating' | 'decelerating' | 'stable' | 'stagnant' = 'stable';
  
  if (stagnationDays > 7) {
    accelerationTrend = 'stagnant';
  } else if (updates.length >= 3) {
    // Compare velocity in first half vs second half of updates
    const midPoint = Math.floor(updates.length / 2);
    const firstHalf = updates.slice(0, midPoint);
    const secondHalf = updates.slice(midPoint);
    
    const firstHalfProgress = firstHalf.length > 0 
      ? firstHalf[firstHalf.length - 1].percentage - (firstHalf[0]?.percentage || 0)
      : 0;
    const secondHalfProgress = secondHalf.length > 0
      ? secondHalf[secondHalf.length - 1].percentage - (secondHalf[0]?.percentage || 0)
      : 0;
    
    const firstHalfDays = firstHalf.length > 1
      ? Math.max(differenceInDays(parseISO(firstHalf[firstHalf.length - 1].createdAt), parseISO(firstHalf[0].createdAt)), 1)
      : 1;
    const secondHalfDays = secondHalf.length > 1
      ? Math.max(differenceInDays(parseISO(secondHalf[secondHalf.length - 1].createdAt), parseISO(secondHalf[0].createdAt)), 1)
      : 1;
    
    const firstHalfVelocity = firstHalfProgress / firstHalfDays;
    const secondHalfVelocity = secondHalfProgress / secondHalfDays;
    
    const velocityChange = secondHalfVelocity - firstHalfVelocity;
    
    if (velocityChange > 1) {
      accelerationTrend = 'accelerating';
    } else if (velocityChange < -1) {
      accelerationTrend = 'decelerating';
    }
  }
  
  return {
    progressPerDay: Math.round(progressPerDay * 100) / 100,
    progressPerWeek: Math.round(progressPerWeek * 100) / 100,
    accelerationTrend,
    lastActiveDate,
    stagnationDays,
  };
}

/**
 * Saves computed velocity metrics to the database
 */
export async function saveVelocityMetrics(
  entityId: string,
  entityType: 'goal' | 'milestone',
  velocity: VelocityComputationResult
): Promise<VelocityMetrics> {
  const metrics: VelocityMetrics = {
    entityId,
    entityType,
    ...velocity,
    computedAt: new Date().toISOString(),
  };
  
  await db.saveVelocityMetrics(metrics);
  return metrics;
}

// ============================================================================
// Estimation Accuracy
// ============================================================================

export interface EstimationAnalysisResult {
  timelineAccuracy?: number;
  effortAccuracy?: number;
  difficultyAccuracy?: number;
  overallAccuracy?: number;
  bias: 'overestimate' | 'underestimate' | 'accurate' | 'unknown';
}

/**
 * Computes estimation accuracy by comparing expected vs actual outcomes
 */
export function computeEstimationAccuracy(
  entity: Goal | Milestone,
  progressUpdates: ProgressUpdate[]
): EstimationAnalysisResult {
  const result: EstimationAnalysisResult = {
    bias: 'unknown',
  };
  
  if (!entity.expectedOutcome || !entity.actualOutcome) {
    return result;
  }
  
  const expected = entity.expectedOutcome;
  const actual = entity.actualOutcome;
  
  // Timeline accuracy
  if (expected.estimatedTimelineDays !== undefined && actual.timelineDeviation !== undefined) {
    const actualDays = expected.estimatedTimelineDays + actual.timelineDeviation;
    if (actualDays > 0) {
      // 100% = perfect, <100% = took longer, >100% = finished early
      result.timelineAccuracy = Math.round((expected.estimatedTimelineDays / actualDays) * 100);
    }
  }
  
  // Effort accuracy (based on time spent in progress updates)
  if (expected.estimatedEffortHours !== undefined) {
    const totalTimeSpent = progressUpdates
      .filter(u => u.entityId === entity.id)
      .reduce((sum, u) => sum + (u.timeSpentMinutes || 0), 0);
    const actualHours = totalTimeSpent / 60;
    
    if (actualHours > 0) {
      result.effortAccuracy = Math.round((expected.estimatedEffortHours / actualHours) * 100);
    }
  }
  
  // Difficulty accuracy (compare estimated vs perceived difficulty in progress updates)
  if (expected.estimatedDifficulty !== undefined) {
    const difficultyRatings = progressUpdates
      .filter(u => u.entityId === entity.id && u.perceivedDifficulty !== undefined)
      .map(u => u.perceivedDifficulty as number);
    
    if (difficultyRatings.length > 0) {
      const avgPerceivedDifficulty = difficultyRatings.reduce((a, b) => a + b, 0) / difficultyRatings.length;
      // Scale to percentage where 100% = accurate, <100% = underestimated, >100% = overestimated
      result.difficultyAccuracy = Math.round((expected.estimatedDifficulty / avgPerceivedDifficulty) * 100);
    }
  }
  
  // Calculate overall accuracy (average of available accuracies)
  const accuracies = [result.timelineAccuracy, result.effortAccuracy, result.difficultyAccuracy].filter(a => a !== undefined) as number[];
  if (accuracies.length > 0) {
    result.overallAccuracy = Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length);
    
    // Determine bias
    if (result.overallAccuracy >= 90 && result.overallAccuracy <= 110) {
      result.bias = 'accurate';
    } else if (result.overallAccuracy < 90) {
      result.bias = 'underestimate';
    } else {
      result.bias = 'overestimate';
    }
  }
  
  return result;
}

/**
 * Saves computed estimation accuracy to the database
 */
export async function saveEstimationAccuracyMetrics(
  entityId: string,
  entityType: 'goal' | 'milestone',
  accuracy: EstimationAnalysisResult
): Promise<EstimationAccuracy> {
  const metrics: EstimationAccuracy = {
    entityId,
    entityType,
    ...accuracy,
    computedAt: new Date().toISOString(),
  };
  
  await db.saveEstimationAccuracy(metrics);
  return metrics;
}

// ============================================================================
// Outcome Quality Score
// ============================================================================

export interface OutcomeQualityResult {
  timelinessScore: number;
  scopeAdherenceScore: number;
  impactScore: number;
  efficiencyScore: number;
  satisfactionScore: number;
  overallScore: number;
  explanation: string;
}

/**
 * Computes outcome quality score for a completed goal or milestone
 */
export function computeOutcomeQuality(
  entity: Goal | Milestone,
  progressUpdates: ProgressUpdate[]
): OutcomeQualityResult {
  let timelinessScore = 50; // Default to neutral
  let scopeAdherenceScore = 50;
  let impactScore = 50;
  let efficiencyScore = 50;
  let satisfactionScore = 50;
  const explanations: string[] = [];
  
  // Timeliness score (based on target date vs completion date)
  if (entity.targetDate && entity.completedAt) {
    const targetDate = parseISO(entity.targetDate);
    const completedDate = parseISO(entity.completedAt);
    const daysDiff = differenceInDays(completedDate, targetDate);
    
    if (daysDiff <= 0) {
      // Completed on time or early
      timelinessScore = Math.min(100, 100 + daysDiff * 2); // Bonus for early completion
      explanations.push(`Completed ${Math.abs(daysDiff)} days early`);
    } else {
      // Late completion
      timelinessScore = Math.max(0, 100 - daysDiff * 5); // Penalty for late
      explanations.push(`Completed ${daysDiff} days late`);
    }
  } else if (entity.state === 'completed') {
    timelinessScore = 70; // No target date but completed
    explanations.push('Completed without target date');
  }
  
  // Scope adherence score (based on actual outcome success score)
  if (entity.actualOutcome?.successScore !== undefined) {
    scopeAdherenceScore = entity.actualOutcome.successScore;
    explanations.push(`Success score: ${scopeAdherenceScore}%`);
  }
  
  // Impact score (based on priority weight)
  if ('priorityWeight' in entity) {
    impactScore = (entity as Goal).priorityWeight;
  } else {
    // For milestones, use priority level
    const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
    impactScore = priorityScores[entity.priority];
  }
  
  // Efficiency score (based on estimated vs actual effort)
  const entityUpdates = progressUpdates.filter(u => u.entityId === entity.id);
  if (entity.expectedOutcome?.estimatedEffortHours && entityUpdates.length > 0) {
    const totalTimeSpent = entityUpdates.reduce((sum, u) => sum + (u.timeSpentMinutes || 0), 0);
    const actualHours = totalTimeSpent / 60;
    const estimatedHours = entity.expectedOutcome.estimatedEffortHours;
    
    if (actualHours > 0) {
      const efficiency = estimatedHours / actualHours;
      efficiencyScore = Math.min(100, Math.max(0, Math.round(efficiency * 100)));
      explanations.push(`Effort efficiency: ${efficiencyScore}%`);
    }
  }
  
  // Satisfaction score (based on motivation levels in progress updates)
  const motivationRatings = entityUpdates
    .filter(u => u.motivationLevel !== undefined)
    .map(u => u.motivationLevel as number);
  
  if (motivationRatings.length > 0) {
    const avgMotivation = motivationRatings.reduce((a, b) => a + b, 0) / motivationRatings.length;
    satisfactionScore = Math.round(avgMotivation * 10); // Scale 1-10 to 0-100
  }
  
  // Calculate overall score (weighted average)
  const weights = {
    timeliness: 0.25,
    scope: 0.25,
    impact: 0.20,
    efficiency: 0.15,
    satisfaction: 0.15,
  };
  
  const overallScore = Math.round(
    timelinessScore * weights.timeliness +
    scopeAdherenceScore * weights.scope +
    impactScore * weights.impact +
    efficiencyScore * weights.efficiency +
    satisfactionScore * weights.satisfaction
  );
  
  return {
    timelinessScore,
    scopeAdherenceScore,
    impactScore,
    efficiencyScore,
    satisfactionScore,
    overallScore,
    explanation: explanations.join('; ') || 'Default scoring applied',
  };
}

/**
 * Saves computed outcome quality to the database
 */
export async function saveOutcomeQualityMetrics(
  entityId: string,
  entityType: 'goal' | 'milestone',
  quality: OutcomeQualityResult
): Promise<OutcomeQualityScore> {
  const metrics: OutcomeQualityScore = {
    entityId,
    entityType,
    ...quality,
    computedAt: new Date().toISOString(),
  };
  
  await db.saveOutcomeQuality(metrics);
  return metrics;
}

// ============================================================================
// Trend Analysis
// ============================================================================

export interface TrendAnalysisResult {
  consistencyScore: number;
  motivationTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  completionReliability: number;
  abandonmentRate: number;
  burnoutRisk: 'low' | 'medium' | 'high' | 'critical';
  recoveryPattern?: string;
  averageVelocity: number;
  optimismBias?: number;
}

/**
 * Analyzes long-term trends across all goals
 */
export function computeTrendAnalysis(
  goals: Goal[],
  progressUpdates: ProgressUpdate[]
): TrendAnalysisResult {
  const result: TrendAnalysisResult = {
    consistencyScore: 50,
    motivationTrend: 'stable',
    completionReliability: 0,
    abandonmentRate: 0,
    burnoutRisk: 'low',
    averageVelocity: 0,
  };
  
  if (goals.length === 0) {
    return result;
  }
  
  // Completion reliability
  const completedGoals = goals.filter(g => g.state === 'completed');
  const failedGoals = goals.filter(g => g.state === 'failed');
  const abandonedGoals = goals.filter(g => g.state === 'abandoned');
  const terminalGoals = completedGoals.length + failedGoals.length + abandonedGoals.length;
  
  if (terminalGoals > 0) {
    result.completionReliability = Math.round((completedGoals.length / terminalGoals) * 100);
    result.abandonmentRate = Math.round((abandonedGoals.length / terminalGoals) * 100);
  }
  
  // Consistency score (based on update frequency)
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentUpdates = progressUpdates.filter(u => 
    parseISO(u.createdAt) >= thirtyDaysAgo
  );
  
  // Calculate days with updates in last 30 days
  const uniqueDays = new Set(
    recentUpdates.map(u => parseISO(u.createdAt).toDateString())
  ).size;
  result.consistencyScore = Math.round((uniqueDays / 30) * 100);
  
  // Motivation trend
  const motivationRatings = progressUpdates
    .filter(u => u.motivationLevel !== undefined)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(u => u.motivationLevel as number);
  
  if (motivationRatings.length >= 5) {
    const firstHalf = motivationRatings.slice(0, Math.floor(motivationRatings.length / 2));
    const secondHalf = motivationRatings.slice(Math.floor(motivationRatings.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    // Check for volatility
    const variance = motivationRatings.reduce((sum, r) => {
      const mean = motivationRatings.reduce((a, b) => a + b, 0) / motivationRatings.length;
      return sum + Math.pow(r - mean, 2);
    }, 0) / motivationRatings.length;
    
    if (variance > 4) {
      result.motivationTrend = 'volatile';
    } else if (diff > 1) {
      result.motivationTrend = 'improving';
    } else if (diff < -1) {
      result.motivationTrend = 'declining';
    }
  }
  
  // Burnout risk assessment
  const recentEmotionalStates = progressUpdates
    .filter(u => parseISO(u.createdAt) >= thirtyDaysAgo && u.emotionalState)
    .map(u => u.emotionalState);
  
  const burnedOutCount = recentEmotionalStates.filter(s => s === 'burned_out' || s === 'stressed').length;
  const recentCount = recentEmotionalStates.length;
  
  if (recentCount > 0) {
    const burnoutRatio = burnedOutCount / recentCount;
    if (burnoutRatio >= 0.5) {
      result.burnoutRisk = 'critical';
      result.recoveryPattern = 'Recommend taking a break and reducing workload';
    } else if (burnoutRatio >= 0.3) {
      result.burnoutRisk = 'high';
      result.recoveryPattern = 'Consider reducing active goals and focusing on high-priority items';
    } else if (burnoutRatio >= 0.15) {
      result.burnoutRisk = 'medium';
    }
  }
  
  // Low consistency can also indicate burnout
  if (result.consistencyScore < 20 && goals.filter(g => g.state === 'active').length > 0) {
    if (result.burnoutRisk === 'low') {
      result.burnoutRisk = 'medium';
    }
  }
  
  // Average velocity across active goals
  const activeGoals = goals.filter(g => g.state === 'active');
  if (activeGoals.length > 0) {
    const velocities = activeGoals.map(g => {
      const velocity = computeVelocity(g.id, progressUpdates, g.createdAt);
      return velocity.progressPerDay;
    });
    result.averageVelocity = Math.round(
      (velocities.reduce((a, b) => a + b, 0) / velocities.length) * 100
    ) / 100;
  }
  
  // Optimism bias (compare confidence levels with actual outcomes)
  const completedWithOutcomes = completedGoals.filter(g => g.actualOutcome?.successScore !== undefined);
  if (completedWithOutcomes.length >= 3) {
    let totalConfidence = 0;
    let totalSuccess = 0;
    let count = 0;
    
    for (const goal of completedWithOutcomes) {
      const goalUpdates = progressUpdates.filter(u => u.entityId === goal.id && u.confidenceLevel !== undefined);
      if (goalUpdates.length > 0) {
        const avgConfidence = goalUpdates.reduce((a, u) => a + (u.confidenceLevel || 0), 0) / goalUpdates.length;
        totalConfidence += avgConfidence * 10; // Scale to 0-100
        totalSuccess += goal.actualOutcome!.successScore!;
        count++;
      }
    }
    
    if (count >= 3) {
      result.optimismBias = Math.round((totalConfidence / count) - (totalSuccess / count));
      // Positive = overconfident, Negative = underconfident
    }
  }
  
  return result;
}

/**
 * Saves computed trend analysis to the database
 */
export async function saveTrendAnalysisMetrics(
  trend: TrendAnalysisResult
): Promise<TrendAnalysis> {
  const metrics: TrendAnalysis = {
    userId: 'default',
    ...trend,
    computedAt: new Date().toISOString(),
  };
  
  await db.saveTrendAnalysis(metrics);
  return metrics;
}

// ============================================================================
// Completion Probability Prediction
// ============================================================================

export interface CompletionPrediction {
  probability: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  estimatedCompletionDate?: string;
  riskFactors: string[];
  positiveFactors: string[];
}

/**
 * Predicts the probability of goal completion based on current progress and historical patterns
 */
export function predictCompletionProbability(
  goal: Goal,
  milestones: Milestone[],
  progressUpdates: ProgressUpdate[],
  dependencies: { sourceId: string; targetId: string; blocked: boolean }[],
  historicalCompletionRate: number
): CompletionPrediction {
  const prediction: CompletionPrediction = {
    probability: 50,
    confidence: 'insufficient_data',
    riskFactors: [],
    positiveFactors: [],
  };
  
  const goalMilestones = milestones.filter(m => m.goalId === goal.id);
  const goalUpdates = progressUpdates.filter(u => u.entityId === goal.id);
  
  // Base probability on current progress
  let probability = goal.progress * 0.5; // Progress contributes up to 50%
  
  // Factor in velocity
  const velocity = computeVelocity(goal.id, progressUpdates, goal.createdAt);
  
  if (velocity.accelerationTrend === 'accelerating') {
    probability += 15;
    prediction.positiveFactors.push('Velocity is accelerating');
  } else if (velocity.accelerationTrend === 'stagnant') {
    probability -= 20;
    prediction.riskFactors.push('No recent progress updates');
  } else if (velocity.accelerationTrend === 'decelerating') {
    probability -= 10;
    prediction.riskFactors.push('Velocity is slowing down');
  }
  
  // Factor in dependencies
  const blockedDeps = dependencies.filter(d => d.sourceId === goal.id && d.blocked);
  if (blockedDeps.length > 0) {
    probability -= blockedDeps.length * 10;
    prediction.riskFactors.push(`${blockedDeps.length} blocking dependencies`);
  }
  
  // Factor in milestone completion
  if (goalMilestones.length > 0) {
    const completedMilestones = goalMilestones.filter(m => m.state === 'completed').length;
    const milestoneCompletion = completedMilestones / goalMilestones.length;
    probability += milestoneCompletion * 20;
    
    if (milestoneCompletion > 0.7) {
      prediction.positiveFactors.push('Most milestones completed');
    }
  }
  
  // Factor in historical completion rate
  probability = probability * 0.7 + historicalCompletionRate * 0.3;
  
  // Factor in deadline proximity
  if (goal.targetDate) {
    const daysRemaining = differenceInDays(parseISO(goal.targetDate), new Date());
    const progressRemaining = 100 - goal.progress;
    
    if (daysRemaining > 0) {
      const requiredVelocity = progressRemaining / daysRemaining;
      
      if (velocity.progressPerDay >= requiredVelocity * 1.2) {
        probability += 10;
        prediction.positiveFactors.push('On track to meet deadline');
      } else if (velocity.progressPerDay < requiredVelocity * 0.5) {
        probability -= 15;
        prediction.riskFactors.push('Unlikely to meet deadline at current velocity');
      }
      

    } else if (daysRemaining < 0) {
      probability -= 20;
      prediction.riskFactors.push('Past target date');
    }
  }
  
  // Estimate completion date based on velocity (independent of target date)
  if (goal.progress < 100 && velocity.progressPerDay > 0) {
    const progressRemaining = 100 - goal.progress;
    const daysToComplete = progressRemaining / velocity.progressPerDay;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(daysToComplete));
    prediction.estimatedCompletionDate = estimatedDate.toISOString();
  }
  
  // Confidence level based on data availability
  const dataPoints = goalUpdates.length + goalMilestones.length;
  // Enhanced confidence calculation
  if (dataPoints >= 10 && velocity.accelerationTrend !== 'stagnant') {
    prediction.confidence = 'high';
  } else if (dataPoints >= 5) {
    prediction.confidence = 'medium';
  } else {
    // Fewer than 5 points or stagnant is low confidence
    prediction.confidence = 'low';
  }
  
  // Clamp probability between 0 and 100
  prediction.probability = Math.max(0, Math.min(100, Math.round(probability)));
  
  return prediction;
}

// ============================================================================
// Simulation Engine
// ============================================================================

export interface SimulationResult {
  originalProbability: number;
  simulatedProbability: number;
  workloadChange: number; // Percentage change
  timelineChange: number; // Days
  recommendations: string[];
}

/**
 * Simulates the impact of changes without modifying actual data
 */
export function simulateChanges(
  goal: Goal,
  milestones: Milestone[],
  progressUpdates: ProgressUpdate[],
  dependencies: { sourceId: string; targetId: string; blocked: boolean }[],
  changes: {
    newProgress?: number;
    newTargetDate?: string;
    priorityChange?: number;
    removeDependencies?: string[];
  }
): SimulationResult {
  // Get original prediction
  const originalPrediction = predictCompletionProbability(
    goal,
    milestones,
    progressUpdates,
    dependencies,
    50 // Assume 50% historical rate for simulation
  );
  
  // Create simulated goal
  const simulatedGoal = { ...goal };
  if (changes.newProgress !== undefined) {
    simulatedGoal.progress = changes.newProgress;
  }
  if (changes.newTargetDate !== undefined) {
    simulatedGoal.targetDate = changes.newTargetDate;
  }
  if (changes.priorityChange !== undefined) {
    simulatedGoal.priorityWeight = Math.max(1, Math.min(100, goal.priorityWeight + changes.priorityChange));
  }
  
  // Filter out removed dependencies
  let simulatedDeps = dependencies;
  if (changes.removeDependencies) {
    simulatedDeps = dependencies.filter(d => !changes.removeDependencies!.includes(d.targetId));
  }
  
  // Get simulated prediction
  const simulatedPrediction = predictCompletionProbability(
    simulatedGoal,
    milestones,
    progressUpdates,
    simulatedDeps,
    50
  );
  
  // Calculate changes
  const workloadChange = changes.priorityChange 
    ? (changes.priorityChange / goal.priorityWeight) * 100 
    : 0;
  
  let timelineChange = 0;
  if (changes.newTargetDate && goal.targetDate) {
    timelineChange = differenceInDays(parseISO(changes.newTargetDate), parseISO(goal.targetDate));
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (simulatedPrediction.probability > originalPrediction.probability + 10) {
    recommendations.push('These changes would significantly improve completion probability');
  } else if (simulatedPrediction.probability < originalPrediction.probability - 10) {
    recommendations.push('These changes would decrease completion probability');
  }
  
  if (changes.removeDependencies && changes.removeDependencies.length > 0) {
    recommendations.push(`Removing ${changes.removeDependencies.length} dependencies would reduce blockers`);
  }
  
  if (timelineChange > 14) {
    recommendations.push('Extending deadline by more than 2 weeks may indicate scope issues');
  } else if (timelineChange < -7) {
    recommendations.push('Shortening deadline significantly may require additional resources');
  }
  
  return {
    originalProbability: originalPrediction.probability,
    simulatedProbability: simulatedPrediction.probability,
    workloadChange,
    timelineChange,
    recommendations,
  };
}

// ============================================================================
// Batch Analytics Computation
// ============================================================================

// ... (Existing computeAllAnalytics) ...

// ============================================================================
// Priority Alignment
// ============================================================================

export interface PriorityAlignmentResult {
  alignmentScore: number; // 0-100
  timeAllocatedToHighPriority: number; // Percentage
  misalignedEntities: string[]; // IDs of high priority items with low progress
  driftWarning?: string;
}

export function computePriorityAlignment(
  goals: Goal[],
  progressUpdates: ProgressUpdate[]
): PriorityAlignmentResult {
  const result: PriorityAlignmentResult = {
    alignmentScore: 100,
    timeAllocatedToHighPriority: 0,
    misalignedEntities: [],
  };

  if (goals.length === 0) return result;

  const activeGoals = goals.filter(g => g.state === 'active');
  const now = new Date();
  const recentUpdates = progressUpdates.filter(u => differenceInDays(now, parseISO(u.createdAt)) <= 30);
  
  if (recentUpdates.length === 0) return result;

  // Calculate weighted time/effort
  let totalTime = 0;
  let highPriorityTime = 0;
  
  const goalEffort = new Map<string, number>();

  recentUpdates.forEach(u => {
    const time = u.timeSpentMinutes || 30; // Default to 30m if not set
    totalTime += time;
    goalEffort.set(u.entityId, (goalEffort.get(u.entityId) || 0) + time);
  });

  const highPriorityGoals = activeGoals.filter(g => g.priority === 'critical' || g.priority === 'high');
  
  highPriorityGoals.forEach(g => {
    const effort = goalEffort.get(g.id) || 0;
    highPriorityTime += effort;
    
    // Check for neglected high priority goals (active but < 5% of effort)
    if (activeGoals.length > 3 && (effort / totalTime) < 0.05) {
      result.misalignedEntities.push(g.title);
    }
  });

  if (totalTime > 0) {
    result.timeAllocatedToHighPriority = Math.round((highPriorityTime / totalTime) * 100);
    
    // Alignment score penalizes if high priority items get < 50% of attention
    if (result.timeAllocatedToHighPriority < 50 && highPriorityGoals.length > 0) {
      result.alignmentScore = Math.max(0, 100 - (50 - result.timeAllocatedToHighPriority) * 2);
      result.driftWarning = 'High priority goals are receiving insufficient attention.';
    }
  }

  return result;
}

/**
 * Computes and saves all analytics for a goal
 */
export async function computeAllAnalytics(
  goal: Goal,
  milestones: Milestone[],
  progressUpdates: ProgressUpdate[]
): Promise<{
  velocity: VelocityMetrics;
  estimationAccuracy?: EstimationAccuracy;
  outcomeQuality?: OutcomeQualityScore;
  priorityAlignment?: PriorityAlignmentResult;
}> {
  // Velocity
  const velocityResult = computeVelocity(goal.id, progressUpdates, goal.createdAt);
  const velocity = await saveVelocityMetrics(goal.id, 'goal', velocityResult);
  
  let estimationAccuracy: EstimationAccuracy | undefined;
  let outcomeQuality: OutcomeQualityScore | undefined;
  
  // Estimation accuracy (only if outcome data exists)
  if (goal.expectedOutcome && goal.actualOutcome) {
    const accuracyResult = computeEstimationAccuracy(goal, progressUpdates);
    estimationAccuracy = await saveEstimationAccuracyMetrics(goal.id, 'goal', accuracyResult);
  }
  
  // Outcome quality (only if completed)
  if (goal.state === 'completed') {
    const qualityResult = computeOutcomeQuality(goal, progressUpdates);
    outcomeQuality = await saveOutcomeQualityMetrics(goal.id, 'goal', qualityResult);
  }
  
  return { velocity, estimationAccuracy, outcomeQuality };
}
