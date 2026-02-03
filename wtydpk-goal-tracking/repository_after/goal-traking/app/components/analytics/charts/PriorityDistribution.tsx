'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useGoalStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';

export function PriorityDistributionChart() {
  const { goals } = useGoalStore();
  
  const data = useMemo(() => {
    const activeGoals = goals.filter(g => !['completed', 'failed', 'abandoned'].includes(g.state));
    
    return ['critical', 'high', 'medium', 'low'].map(priority => {
      const priorityGoals = activeGoals.filter(g => g.priority === priority);
      const avgProgress = priorityGoals.length > 0
        ? priorityGoals.reduce((sum, g) => sum + g.progress, 0) / priorityGoals.length
        : 0;
      
      return {
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        count: priorityGoals.length,
        avgProgress: Math.round(avgProgress),
      };
    });
  }, [goals]);
  
  return (
    <Card variant="glass" className="h-[300px] flex flex-col">
      <div className="mb-2">
        <h3 className="text-lg font-semibold tracking-tight">Active Priorities</h3>
        <p className="text-xs text-muted-foreground">Distribution of active goals by priority</p>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis 
               type="category" 
               dataKey="priority" 
               stroke="rgba(255,255,255,0.7)" 
               fontSize={12} 
               tickLine={false}
               axisLine={false}
               width={60}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Bar 
               dataKey="count" 
               fill="hsl(var(--primary))" 
               name="Count" 
               radius={[0, 4, 4, 0]} 
               barSize={20}
            />
            <Bar 
               dataKey="avgProgress" 
               fill="#10b981" 
               name="Avg Progress" 
               radius={[0, 4, 4, 0]} 
               barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
