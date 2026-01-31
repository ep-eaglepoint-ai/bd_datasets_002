'use client';

import React, { useMemo } from 'react';
import { useGoalStore } from '@/lib/store';
import { ProgressTimelineChart } from './analytics/charts/ProgressTimeline';
import { GoalStateDistributionChart } from './analytics/charts/StateDistribution';
import { MotivationTrendChart } from './analytics/charts/MotivationTrend';
import { PriorityDistributionChart } from './analytics/charts/PriorityDistribution';
import { ConsistencyHeatmap } from './analytics/charts/ConsistencyHeatmap';
import { TrendSummaryCard } from './analytics/charts/TrendSummary';
import { BurndownChart } from './analytics/charts/BurndownChart';
import { EstimationAccuracyChart } from './analytics/charts/EstimationAccuracyChart';
import { CompletionProbabilityChart } from './analytics/charts/CompletionProbabilityChart';
import { CascadingDelaysPanel } from './analytics/CascadingDelaysPanel';

export function AnalyticsDashboard() {
  const { goals, milestones, dependencies, progressUpdates } = useGoalStore();

  // Select first active goal with a target date for burndown
  const burndownGoal = useMemo(() => {
    return goals.find(g => g.state === 'active' && g.targetDate) || goals[0];
  }, [goals]);
  
  const burndownMilestones = useMemo(() => {
    if (!burndownGoal) return [];
    return milestones.filter(m => m.goalId === burndownGoal.id);
  }, [burndownGoal, milestones]);

  // Compute overall completion probability (simplified)
  const probability = useMemo(() => {
    if (goals.length === 0) return { value: 0, confidence: 'insufficient_data' as const, risks: [], positives: [] };
    const activeGoals = goals.filter(g => g.state === 'active');
    const avgProgress = activeGoals.length > 0 
      ? activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length 
      : 0;
    
    const risks: string[] = [];
    const positives: string[] = [];
    
    if (avgProgress < 30) risks.push('Low average progress');
    if (avgProgress >= 70) positives.push('Strong progress overall');
    if (activeGoals.length > 10) risks.push('Many active goals');
    if (dependencies.length > 20) risks.push('Complex dependencies');
    
    const prob = Math.min(100, Math.round(avgProgress * 1.2 + 20));
    const confidence = avgProgress > 50 ? 'high' : avgProgress > 25 ? 'medium' : 'low';
    
    return { value: prob, confidence: confidence as 'high' | 'medium' | 'low', risks, positives };
  }, [goals, dependencies]);

  return (
    <div className="space-y-6 animate-in fade-in slide-up duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-white">Analytics Dashboard</h2>
        <span className="text-sm text-muted-foreground">Real-time insights</span>
      </div>
      
      {/* Top Row: Timeline (Wide) & Stat Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <ProgressTimelineChart />
        </div>
        <div>
           <GoalStateDistributionChart />
        </div>
      </div>
      
      {/* Advanced Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {burndownGoal && (
          <BurndownChart goal={burndownGoal} milestones={burndownMilestones} />
        )}
        <EstimationAccuracyChart goals={goals} milestones={milestones} />
        <CompletionProbabilityChart 
          probability={probability.value} 
          confidence={probability.confidence}
          riskFactors={probability.risks}
          positiveFactors={probability.positives}
        />
      </div>
      
      {/* Middle Row: Trend Summary & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendSummaryCard />
        <ConsistencyHeatmap />
      </div>
      
      {/* Cascading Delays Panel */}
      <CascadingDelaysPanel goals={goals} milestones={milestones} dependencies={dependencies} />
      
      {/* Bottom Row: Motivation & Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MotivationTrendChart />
        <PriorityDistributionChart />
      </div>
    </div>
  );
}

