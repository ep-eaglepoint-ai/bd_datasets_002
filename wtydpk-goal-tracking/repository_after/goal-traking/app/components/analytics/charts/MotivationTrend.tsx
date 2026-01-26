'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useGoalStore } from '@/lib/store';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay } from 'date-fns';
import { Card } from '@/components/ui/Card';

export function MotivationTrendChart() {
  const { progressUpdates } = useGoalStore();
  
  const data = useMemo(() => {
    const now = new Date();
    const days = 14; // Showing 2 weeks for better granularity
    const startDate = subDays(now, days);
    
    const dateRange = eachDayOfInterval({ start: startDate, end: now });
    
    return dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayUpdates = progressUpdates.filter(u => {
        const updateDate = startOfDay(parseISO(u.createdAt));
        return updateDate.getTime() === dayStart.getTime() && (u.motivationLevel !== undefined || u.confidenceLevel !== undefined);
      });
      
      const avgMotivation = dayUpdates.length > 0
        ? dayUpdates.reduce((sum, u) => sum + (u.motivationLevel || 0), 0) / dayUpdates.length
        : null;
      
      const avgConfidence = dayUpdates.length > 0
        ? dayUpdates.reduce((sum, u) => sum + (u.confidenceLevel || 0), 0) / dayUpdates.length
        : null;
      
      return {
        date: format(date, 'MMM dd'),
        motivation: avgMotivation ? Number(avgMotivation.toFixed(1)) : null,
        confidence: avgConfidence ? Number(avgConfidence.toFixed(1)) : null,
      };
    });
  }, [progressUpdates]);
  
  const hasData = data.some(d => d.motivation !== null || d.confidence !== null);
  
  if (!hasData) {
    return (
      <Card variant="glass" className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground text-center px-8">
           Not enough data for Motivation Trend.<br/>
           <span className="text-xs opacity-70">Log progress updates with motivation & confidence ratings.</span>
        </p>
      </Card>
    );
  }
  
  return (
    <Card variant="glass" className="h-[300px] flex flex-col">
      <div className="mb-2">
        <h3 className="text-lg font-semibold tracking-tight">Psychometrics</h3>
        <p className="text-xs text-muted-foreground">Motivation & Confidence over time</p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              domain={[0, 10]}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line
              type="monotone"
              dataKey="motivation"
              stroke="#f59e0b" // amber
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b' }}
              name="Motivation"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="confidence"
              stroke="#8b5cf6" // violet
              strokeWidth={2}
              dot={{ r: 3, fill: '#8b5cf6' }}
              name="Confidence"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
