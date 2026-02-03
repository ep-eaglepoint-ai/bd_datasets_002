'use client';

import React, { useMemo } from 'react';
import { useGoalStore } from '@/lib/store';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';


export function ConsistencyHeatmap() {
  const { progressUpdates } = useGoalStore();
  
  const data = useMemo(() => {
    const now = new Date();
    const weeks = 12; // About 3 months
    const totalDays = weeks * 7;
    const days = [];
    
    // We want to show from left to right (oldest to newest) inside the grid columns?
    // Often heatmaps are col-based (weeks).
    // Let's generate array of days.
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const count = progressUpdates.filter(u => {
        const updateDate = startOfDay(parseISO(u.createdAt));
        return updateDate.getTime() === dayStart.getTime();
      }).length;
      days.push({ date, count });
    }
    
    return days;
  }, [progressUpdates]);
  
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  const getColor = (count: number) => {
    if (count === 0) return 'bg-white/5';
    const intensity = count / maxCount;
    if (intensity > 0.75) return 'bg-green-500';
    if (intensity > 0.5) return 'bg-green-600';
    if (intensity > 0.25) return 'bg-green-700';
    return 'bg-green-900';
  };
  
  // Group into weeks (columns)
  // Recharts doesn't do heatmaps well. Custom div grid is better.
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  
  return (
    <Card variant="glass" className="h flex flex-col h-[300px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight">Consistency</h3>
        <p className="text-xs text-muted-foreground">Activity heatmap (last 12 weeks)</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-x-auto pb-4">
        <div className="flex gap-1.5">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1.5">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={cn("w-3.5 h-3.5 rounded-sm transition-colors hover:ring-1 hover:ring-white/50", getColor(day.count))}
                  title={`${format(day.date, 'MMM dd')}: ${day.count} updates`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground justify-end px-4">
         <span>Less</span>
         <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-white/5" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-900" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-700" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-600" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
         </div>
         <span>More</span>
      </div>
    </Card>
  );
}
