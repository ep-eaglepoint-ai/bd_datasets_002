import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, BarChart as BarChartIcon } from 'lucide-react';
import { Goal } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { computeVelocity, computeEstimationAccuracy, computeOutcomeQuality, predictCompletionProbability } from '@/lib/analytics';
import { analyzeBlockedItems, buildDependencyGraph } from '@/lib/dependencies';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface GoalAnalyticsProps {
  goal: Goal;
}

export function GoalAnalytics({ goal }: GoalAnalyticsProps) {
  const { milestones, progressUpdates, dependencies, goals } = useGoalStore();
  
  const analytics = useMemo(() => {
    const goalMilestones = milestones.filter(m => m.goalId === goal.id);
    const goalUpdates = progressUpdates.filter(p => p.entityId === goal.id);
    
    // Velocity
    const velocity = computeVelocity(goal.id, progressUpdates, goal.createdAt);
    
    // Estimation accuracy
    const estimationAccuracy = goal.expectedOutcome && goal.actualOutcome
      ? computeEstimationAccuracy(goal, progressUpdates)
      : null;
    
    // Outcome quality (only for completed goals)
    const outcomeQuality = goal.state === 'completed'
      ? computeOutcomeQuality(goal, progressUpdates)
      : null;
    
    // Dependency analysis
    const graph = buildDependencyGraph(goals, milestones, dependencies);
    const blockedItems = analyzeBlockedItems(graph, dependencies);
    
    // Check if this goal is blocked
    const goalBlockedInfo = blockedItems.find(b => b.itemId === goal.id);
    
    // Completion prediction
    const depWithBlocked = dependencies.map(d => ({
      sourceId: d.sourceId,
      targetId: d.targetId,
      blocked: blockedItems.some(b => b.itemId === d.sourceId),
    }));
    
    const completedGoals = goals.filter(g => g.state === 'completed').length;
    const totalTerminalGoals = goals.filter(g => 
      ['completed', 'failed', 'abandoned'].includes(g.state)
    ).length;
    const historicalRate = totalTerminalGoals > 0 
      ? (completedGoals / totalTerminalGoals) * 100 
      : 50;
    
    const prediction = predictCompletionProbability(
      goal,
      goalMilestones,
      progressUpdates,
      depWithBlocked,
      historicalRate
    );
    
    return {
      velocity,
      estimationAccuracy,
      outcomeQuality,
      blockedBy: goalBlockedInfo?.blockedBy || [],
      prediction,
      milestonesCount: goalMilestones.length,
      completedMilestones: goalMilestones.filter(m => m.state === 'completed').length,
    };
  }, [goal, milestones, progressUpdates, dependencies, goals]);
  
  const velocityColor = {
    accelerating: 'text-green-400',
    stable: 'text-blue-400',
    decelerating: 'text-amber-400',
    stagnant: 'text-destructive',
  };
  
  return (
    <div className="space-y-4 animate-in fade-in slide-up">
      {/* Velocity Card */}
      <Card variant="glass" className="relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Velocity</h4>
            <div className={`flex items-baseline gap-2 mt-1 ${velocityColor[analytics.velocity.accelerationTrend]}`}>
              <span className="text-2xl font-bold">{analytics.velocity.progressPerDay.toFixed(1)}%</span>
              <span className="text-xs font-medium uppercase tracking-wide">/ day</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              Trend: <span className={velocityColor[analytics.velocity.accelerationTrend]}>{analytics.velocity.accelerationTrend}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Prediction Card */}
      <Card variant="glass" className="relative overflow-hidden">
         <div className="flex items-start gap-4 mb-4">
           <div className={`p-3 rounded-lg ${
             analytics.prediction.probability >= 70 ? 'bg-green-500/10 text-green-400' :
             analytics.prediction.probability >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-destructive/10 text-destructive'
           }`}>
             <BarChartIcon className="h-6 w-6" />
           </div>
           <div>
             <h4 className="text-sm font-medium text-muted-foreground">Completion Forecast</h4>
             <div className="flex items-baseline gap-2 mt-1">
               <span className={`text-2xl font-bold ${
                  analytics.prediction.probability >= 70 ? 'text-green-400' :
                  analytics.prediction.probability >= 40 ? 'text-amber-400' : 'text-destructive'
               }`}>
                 {analytics.prediction.probability}%
               </span>
               <span className="text-xs text-muted-foreground">Probability</span>
             </div>
             {analytics.prediction.estimatedCompletionDate && (
               <p className="text-xs text-muted-foreground mt-1">
                 Est. Date: {new Date(analytics.prediction.estimatedCompletionDate).toLocaleDateString()}
               </p>
             )}
           </div>
         </div>
         
         {(analytics.prediction.riskFactors.length > 0 || analytics.prediction.positiveFactors.length > 0) && (
           <div className="space-y-2 pt-3 border-t border-white/5">
             {analytics.prediction.positiveFactors.map((f, i) => (
               <div key={i} className="flex items-center gap-2 text-xs text-green-400">
                 <CheckCircle className="h-3 w-3" /> {f}
               </div>
             ))}
             {analytics.prediction.riskFactors.map((r, i) => (
               <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                 <AlertTriangle className="h-3 w-3" /> {r}
               </div>
             ))}
           </div>
         )}
      </Card>

      {/* Blocked Items */}
      {analytics.blockedBy.length > 0 && (
        <Card className="bg-destructive/10 border-destructive/20">
          <div className="flex items-center gap-2 text-destructive mb-2 font-medium">
             <AlertTriangle className="h-4 w-4" /> Blocked By
          </div>
          <div className="space-y-1 pl-6">
            {analytics.blockedBy.map(blocker => (
              <p key={blocker.id} className="text-sm text-destructive/80">
                • {blocker.title} <span className="text-[10px] opacity-70 border border-destructive/30 px-1 rounded uppercase bg-destructive/5">{blocker.state}</span>
              </p>
            ))}
          </div>
        </Card>
      )}

      {/* Outcome Quality (Completed) */}
      {analytics.outcomeQuality && (
        <Card className="bg-green-500/5 border-green-500/20">
           <h4 className="text-sm font-medium text-green-400 mb-2">Outcome Score: {analytics.outcomeQuality.overallScore}/100</h4>
           <div className="grid grid-cols-2 gap-2">
             <div className="text-xs">
               <span className="text-muted-foreground">Timeliness:</span> <span className="text-green-300">{analytics.outcomeQuality.timelinessScore}</span>
             </div>
             <div className="text-xs">
               <span className="text-muted-foreground">Efficiency:</span> <span className="text-green-300">{analytics.outcomeQuality.efficiencyScore}</span>
             </div>
           </div>
        </Card>
      )}
    </div>
  );
}
