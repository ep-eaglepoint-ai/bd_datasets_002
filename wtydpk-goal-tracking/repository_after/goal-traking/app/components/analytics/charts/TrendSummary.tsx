'use client';

import React, { useMemo } from 'react';
import { Target, TrendingUp, AlertTriangle, Zap, CheckCircle2, TrendingDown, Minus } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { computeTrendAnalysis } from '@/lib/analytics';
import { Card } from '@/components/ui/Card';

export function TrendSummaryCard() {
  const { goals, progressUpdates } = useGoalStore();
  
  const trends = useMemo(() => {
    return computeTrendAnalysis(goals, progressUpdates);
  }, [goals, progressUpdates]);
  
  const motivationIcon = {
    improving: <TrendingUp className="h-4 w-4 text-green-400" />,
    declining: <TrendingDown className="h-4 w-4 text-destructive" />,
    stable: <Minus className="h-4 w-4 text-blue-400" />,
    volatile: <ActivityIcon className="h-4 w-4 text-amber-400" />,
  };

  const riskColor = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-orange-400',
    critical: 'text-destructive',
  };
  
  return (
    <Card variant="glass" className="h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight text-white">Trend Analysis</h3>
        <p className="text-xs text-muted-foreground">AI-driven insights</p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
         {/* Consistency */}
         <div className="p-3 rounded-lg bg-secondary/20 border border-white/5">
             <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs text-muted-foreground">Consistency</span>
             </div>
             <p className="text-xl font-bold">{trends.consistencyScore}%</p>
         </div>
         
         {/* Completion Reliability */}
         <div className="p-3 rounded-lg bg-secondary/20 border border-white/5">
             <div className="flex items-center gap-2 mb-1">
                <Target className="h-3.5 w-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Reliability</span>
             </div>
             <p className="text-xl font-bold">{trends.completionReliability}%</p>
         </div>

         {/* Average Velocity */}
         <div className="p-3 rounded-lg bg-secondary/20 border border-white/5">
             <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Velocity</span>
             </div>
             <p className="text-xl font-bold">{trends.averageVelocity}<span className="text-xs font-normal opacity-70">/day</span></p>
         </div>

         {/* Motivation Trend */}
         <div className="p-3 rounded-lg bg-secondary/20 border border-white/5">
             <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-xs text-muted-foreground">Motivation</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="text-sm font-medium capitalize">{trends.motivationTrend}</span>
               {motivationIcon[trends.motivationTrend]}
             </div>
         </div>

         {/* Burnout Risk */}
         <div className="p-3 rounded-lg bg-secondary/20 border border-white/5">
             <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <span className="text-xs text-muted-foreground">Burnout Risk</span>
             </div>
             <p className={`text-sm font-bold uppercase ${riskColor[trends.burnoutRisk]}`}>
               {trends.burnoutRisk}
             </p>
         </div>
         
         {/* Optimism Bias */}
         {trends.optimismBias !== undefined && (
            <div className="p-3 rounded-lg bg-secondary/20 border border-white/5">
               <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs text-muted-foreground">Bias</span>
               </div>
               <p className={`text-lg font-bold ${trends.optimismBias > 10 ? 'text-amber-400' : 'text-green-400'}`}>
                 {trends.optimismBias > 0 ? '+' : ''}{trends.optimismBias}%
               </p>
            </div>
         )}
      </div>

      {trends.recoveryPattern && (
        <div className="mt-4 p-3 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
           💡 Pattern Detected: <span className="font-medium">{trends.recoveryPattern}</span>
        </div>
      )}
    </Card>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
