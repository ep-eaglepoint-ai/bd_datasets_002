// Web Worker for heavy analytics computations
// Offloads CPU-intensive calculations from the main thread

import { Goal, Milestone, ProgressUpdate, Dependency } from '../types';

// Message types for worker communication
export type WorkerMessage = 
  | { type: 'COMPUTE_TREND_ANALYSIS'; payload: { goals: Goal[]; updates: ProgressUpdate[] } }
  | { type: 'COMPUTE_PREDICTION'; payload: { goal: Goal; milestones: Milestone[]; updates: ProgressUpdate[]; deps: Dependency[]; rate: number } }
  | { type: 'COMPUTE_BATCH_ANALYTICS'; payload: { goals: Goal[]; milestones: Milestone[]; updates: ProgressUpdate[] } };

export type WorkerResponse =
  | { type: 'TREND_RESULT'; payload: TrendAnalysisResult }
  | { type: 'PREDICTION_RESULT'; payload: CompletionPrediction }
  | { type: 'BATCH_RESULT'; payload: BatchAnalyticsResult }
  | { type: 'ERROR'; payload: string };

interface TrendAnalysisResult {
  consistencyScore: number;
  motivationTrend: 'improving' | 'declining' | 'stable' | 'volatile';
  completionReliability: number;
  abandonmentRate: number;
  burnoutRisk: 'low' | 'medium' | 'high' | 'critical';
  averageVelocity: number;
}

interface CompletionPrediction {
  probability: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  estimatedCompletionDate?: string;
  riskFactors: string[];
  positiveFactors: string[];
}

interface BatchAnalyticsResult {
  velocities: Map<string, number>;
  predictions: Map<string, number>;
}

// Worker context
const ctx: Worker = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'COMPUTE_TREND_ANALYSIS': {
        const result = computeTrendAnalysisWorker(payload.goals, payload.updates);
        ctx.postMessage({ type: 'TREND_RESULT', payload: result });
        break;
      }
      case 'COMPUTE_PREDICTION': {
        const result = computePredictionWorker(
          payload.goal, 
          payload.milestones, 
          payload.updates, 
          payload.deps, 
          payload.rate
        );
        ctx.postMessage({ type: 'PREDICTION_RESULT', payload: result });
        break;
      }
      case 'COMPUTE_BATCH_ANALYTICS': {
        const result = computeBatchAnalytics(payload.goals, payload.milestones, payload.updates);
        ctx.postMessage({ type: 'BATCH_RESULT', payload: result });
        break;
      }
    }
  } catch (error) {
    ctx.postMessage({ type: 'ERROR', payload: String(error) });
  }
};

// Trend analysis computation
function computeTrendAnalysisWorker(goals: Goal[], updates: ProgressUpdate[]): TrendAnalysisResult {
  const completedGoals = goals.filter(g => g.state === 'completed');
  const abandonedGoals = goals.filter(g => g.state === 'abandoned' || g.state === 'failed');
  const totalNonActive = completedGoals.length + abandonedGoals.length;
  
  const completionReliability = totalNonActive > 0 
    ? (completedGoals.length / totalNonActive) * 100 
    : 50;
  
  const abandonmentRate = totalNonActive > 0 
    ? (abandonedGoals.length / totalNonActive) * 100 
    : 0;
  
  // Analyze motivation from updates
  const recentUpdates = updates.slice(-30);
  const motivationLevels = recentUpdates
    .filter(u => u.motivationLevel !== undefined)
    .map(u => u.motivationLevel!);
  
  let motivationTrend: 'improving' | 'declining' | 'stable' | 'volatile' = 'stable';
  if (motivationLevels.length >= 5) {
    const firstHalf = motivationLevels.slice(0, Math.floor(motivationLevels.length / 2));
    const secondHalf = motivationLevels.slice(Math.floor(motivationLevels.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 10) motivationTrend = 'improving';
    else if (secondAvg < firstAvg - 10) motivationTrend = 'declining';
  }
  
  // Consistency score based on update frequency
  const updateDates = updates.map(u => new Date(u.createdAt).toDateString());
  const uniqueDays = new Set(updateDates).size;
  const consistencyScore = Math.min(100, (uniqueDays / 30) * 100);
  
  // Burnout risk from emotional states
  const negativeStates = recentUpdates.filter(u => 
    u.emotionalState === 'burned_out' || 
    u.emotionalState === 'discouraged'
  ).length;
  
  let burnoutRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (negativeStates > 10) burnoutRisk = 'critical';
  else if (negativeStates > 5) burnoutRisk = 'high';
  else if (negativeStates > 2) burnoutRisk = 'medium';
  
  // Average velocity
  const velocities = goals.map(g => {
    const goalUpdates = updates.filter(u => u.entityId === g.id);
    if (goalUpdates.length < 2) return 0;
    const firstUpdate = goalUpdates[0];
    const lastUpdate = goalUpdates[goalUpdates.length - 1];
    const days = Math.max(1, (new Date(lastUpdate.createdAt).getTime() - new Date(firstUpdate.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return (lastUpdate.percentage - firstUpdate.percentage) / days;
  });
  const averageVelocity = velocities.length > 0 
    ? velocities.reduce((a, b) => a + b, 0) / velocities.length 
    : 0;
  
  return {
    consistencyScore: Math.round(consistencyScore),
    motivationTrend,
    completionReliability: Math.round(completionReliability),
    abandonmentRate: Math.round(abandonmentRate),
    burnoutRisk,
    averageVelocity: Math.round(averageVelocity * 100) / 100,
  };
}

// Prediction computation
function computePredictionWorker(
  goal: Goal,
  milestones: Milestone[],
  updates: ProgressUpdate[],
  deps: Dependency[],
  historicalRate: number
): CompletionPrediction {
  const riskFactors: string[] = [];
  const positiveFactors: string[] = [];
  
  let probability = 50; // Base probability
  
  // Progress impact
  if (goal.progress >= 75) {
    probability += 25;
    positiveFactors.push('High progress (>75%)');
  } else if (goal.progress >= 50) {
    probability += 10;
    positiveFactors.push('Good progress (>50%)');
  } else if (goal.progress < 25) {
    probability -= 15;
    riskFactors.push('Low progress (<25%)');
  }
  
  // Historical rate impact
  probability = probability * 0.7 + historicalRate * 0.3;
  
  // Dependency check
  const blockedDeps = deps.filter(d => d.targetId === goal.id && d.dependencyType === 'blocks');
  if (blockedDeps.length > 0) {
    probability -= blockedDeps.length * 10;
    riskFactors.push(`${blockedDeps.length} blocking dependencies`);
  }
  
  // Deadline check
  if (goal.targetDate) {
    const daysRemaining = (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const progressNeeded = 100 - goal.progress;
    
    if (daysRemaining < 0) {
      probability -= 30;
      riskFactors.push('Past deadline');
    } else if (daysRemaining < 7 && progressNeeded > 30) {
      probability -= 20;
      riskFactors.push('Tight deadline with low progress');
    }
  }
  
  // Velocity check from recent updates
  const recentUpdates = updates.filter(u => u.entityId === goal.id).slice(-5);
  if (recentUpdates.length >= 2) {
    const progressDelta = recentUpdates[recentUpdates.length - 1].percentage - recentUpdates[0].percentage;
    if (progressDelta > 10) {
      positiveFactors.push('Strong recent momentum');
      probability += 10;
    } else if (progressDelta <= 0) {
      riskFactors.push('Stagnant progress');
      probability -= 10;
    }
  }
  
  // Clamp probability
  probability = Math.max(0, Math.min(100, Math.round(probability)));
  
  // Confidence based on data quality
  const dataPoints = updates.filter(u => u.entityId === goal.id).length;
  let confidence: 'high' | 'medium' | 'low' | 'insufficient_data' = 'low';
  if (dataPoints >= 10) confidence = 'high';
  else if (dataPoints >= 5) confidence = 'medium';
  else if (dataPoints < 2) confidence = 'insufficient_data';
  
  return {
    probability,
    confidence,
    riskFactors,
    positiveFactors,
  };
}

// Batch analytics for all goals
function computeBatchAnalytics(
  goals: Goal[],
  milestones: Milestone[],
  updates: ProgressUpdate[]
): BatchAnalyticsResult {
  const velocities = new Map<string, number>();
  const predictions = new Map<string, number>();
  
  for (const goal of goals) {
    const goalUpdates = updates.filter(u => u.entityId === goal.id);
    
    // Velocity
    if (goalUpdates.length >= 2) {
      const first = goalUpdates[0];
      const last = goalUpdates[goalUpdates.length - 1];
      const days = Math.max(1, (new Date(last.createdAt).getTime() - new Date(first.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      velocities.set(goal.id, (last.percentage - first.percentage) / days);
    }
    
    // Simple prediction
    const velocity = velocities.get(goal.id) || 0;
    const remaining = 100 - goal.progress;
    const daysNeeded = velocity > 0 ? remaining / velocity : Infinity;
    
    if (goal.targetDate) {
      const daysAvailable = (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      const prob = daysAvailable >= daysNeeded ? 80 : Math.max(0, 80 - ((daysNeeded - daysAvailable) * 5));
      predictions.set(goal.id, Math.round(prob));
    } else {
      predictions.set(goal.id, 50);
    }
  }
  
  return { velocities, predictions };
}

export {};
