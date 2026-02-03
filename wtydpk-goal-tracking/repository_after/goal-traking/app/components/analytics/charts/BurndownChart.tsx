'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Milestone, Goal } from '@/lib/types';
import { format, differenceInDays, eachDayOfInterval, parseISO, addDays } from 'date-fns';

interface BurndownChartProps {
  goal: Goal;
  milestones: Milestone[];
}

export function BurndownChart({ goal, milestones }: BurndownChartProps) {
  const data = useMemo(() => {
    if (!goal.targetDate || !goal.createdAt) return [];
    
    const startDate = parseISO(goal.createdAt);
    const endDate = parseISO(goal.targetDate);
    const totalDays = differenceInDays(endDate, startDate);
    
    if (totalDays <= 0) return [];
    
    const totalWork = milestones.length > 0 
      ? milestones.reduce((sum, m) => sum + (100 - m.progress), 0)
      : 100 - goal.progress;
    
    const dailyIdealBurn = totalWork / totalDays;
    
    // Generate date range
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    return dateRange.map((date, index) => {
      const dayNumber = index + 1;
      const idealRemaining = Math.max(0, totalWork - (dailyIdealBurn * dayNumber));
      
      // Calculate actual remaining work based on current progress
      const progressFraction = dayNumber / totalDays;
      const estimatedActualRemaining = date <= new Date() 
        ? (100 - goal.progress)
        : null;
      
      return {
        date: format(date, 'MMM dd'),
        day: dayNumber,
        ideal: Math.round(idealRemaining),
        actual: estimatedActualRemaining !== null ? Math.round(estimatedActualRemaining) : undefined,
        timestamp: date.getTime(),
      };
    });
  }, [goal, milestones]);

  if (data.length === 0) {
    return (
      <Card variant="glass" className="h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">No timeline data available for burndown chart</p>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="h-[350px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight">Burndown Chart</h3>
        <p className="text-xs text-muted-foreground">Remaining work vs ideal progress</p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="Ideal Burndown"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              name="Actual Remaining"
              connectNulls
            />
            <ReferenceLine y={0} stroke="hsl(var(--success))" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
