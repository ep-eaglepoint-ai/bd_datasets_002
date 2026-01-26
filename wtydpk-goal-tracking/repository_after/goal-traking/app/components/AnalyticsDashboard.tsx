'use client';

import React from 'react';
import { ProgressTimelineChart } from './analytics/charts/ProgressTimeline';
import { GoalStateDistributionChart } from './analytics/charts/StateDistribution';
import { MotivationTrendChart } from './analytics/charts/MotivationTrend';
import { PriorityDistributionChart } from './analytics/charts/PriorityDistribution';
import { ConsistencyHeatmap } from './analytics/charts/ConsistencyHeatmap';
import { TrendSummaryCard } from './analytics/charts/TrendSummary';

export function AnalyticsDashboard() {
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
      
      {/* Middle Row: Trend Summary & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendSummaryCard />
        <ConsistencyHeatmap />
      </div>
      
      {/* Bottom Row: Motivation & Priorities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MotivationTrendChart />
        <PriorityDistributionChart />
      </div>
    </div>
  );
}
