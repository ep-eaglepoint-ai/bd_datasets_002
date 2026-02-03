'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useGoalStore } from '@/lib/store';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay } from 'date-fns';
import { Card } from '@/components/ui/Card';

interface ProgressTimelineProps {
  goalId?: string;
  days?: number;
}

export function ProgressTimelineChart({ goalId, days = 30 }: ProgressTimelineProps) {
  const { progressUpdates } = useGoalStore();
  
  const data = useMemo(() => {
    const now = new Date();
    const startDate = subDays(now, days);
    
    // Ensure we don't go back further than necessary if there's no data
    const dateRange = eachDayOfInterval({ start: startDate, end: now });
    
    const relevantUpdates = goalId
      ? progressUpdates.filter(u => u.entityId === goalId)
      : progressUpdates;
    
    return dateRange.map(date => {
      const dayStart = startOfDay(date);
      const dayUpdates = relevantUpdates.filter(u => {
        const updateDate = startOfDay(parseISO(u.createdAt));
        return updateDate.getTime() === dayStart.getTime();
      });
      
      // Get the last progress value for the day
      const lastUpdate = dayUpdates.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      return {
        date: format(date, 'MMM dd'),
        // If no update on this day, use previous known value or null if start
        progress: lastUpdate?.percentage || null,
        timestamp: date.getTime(),
      };
    });
  }, [progressUpdates, goalId, days]);
  
  // Fill gaps
  const filledData = useMemo(() => {
    let lastProgress = 0;
    return data.map(d => {
      if (d.progress !== null) {
        lastProgress = d.progress;
      }
      return { ...d, progressValue: lastProgress };
    });
  }, [data]);

  return (
    <Card variant="glass" className="h-[350px] flex flex-col">
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight">Progress Timeline</h3>
        <p className="text-xs text-muted-foreground">Tracking overall progress over the last {days} days</p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filledData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
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
              domain={[0, 100]}
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
            <Area
              type="monotone"
              dataKey="progressValue"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorProgress)"
              strokeWidth={2}
              name="Progress"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
