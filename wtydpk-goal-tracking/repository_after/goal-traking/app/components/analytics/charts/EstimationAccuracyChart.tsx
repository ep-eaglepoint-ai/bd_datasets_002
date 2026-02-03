'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Goal, Milestone } from '@/lib/types';

interface EstimationAccuracyChartProps {
  goals: Goal[];
  milestones: Milestone[];
}

export function EstimationAccuracyChart({ goals, milestones }: EstimationAccuracyChartProps) {
  const data = useMemo(() => {
    const completedGoals = goals.filter(g => g.state === 'completed' && g.targetDate);
    
    return completedGoals.slice(0, 10).map(goal => {
      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
      const completedDate = new Date(goal.updatedAt);
      const createdDate = new Date(goal.createdAt);
      
      if (!targetDate) return null;
      
      const estimatedDays = Math.ceil((targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const actualDays = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const accuracy = estimatedDays > 0 
        ? Math.round((1 - Math.abs(actualDays - estimatedDays) / estimatedDays) * 100)
        : 0;
      
      const bias = actualDays > estimatedDays ? 'underestimate' : 
                   actualDays < estimatedDays ? 'overestimate' : 'accurate';
      
      return {
        name: goal.title.substring(0, 15) + (goal.title.length > 15 ? '...' : ''),
        estimated: estimatedDays,
        actual: actualDays,
        accuracy: Math.max(0, accuracy),
        bias,
      };
    }).filter(Boolean);
  }, [goals]);

  if (data.length === 0) {
    return (
      <Card variant="glass" className="h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground">Complete some goals to see estimation accuracy</p>
      </Card>
    );
  }

  const averageAccuracy = Math.round(
    data.reduce((sum, d) => sum + (d?.accuracy || 0), 0) / data.length
  );

  return (
    <Card variant="glass" className="h-[350px] flex flex-col">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Estimation Accuracy</h3>
          <p className="text-xs text-muted-foreground">Estimated vs actual completion time</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{averageAccuracy}%</p>
          <p className="text-xs text-muted-foreground">Avg Accuracy</p>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="name" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={10}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Days', angle: -90, position: 'insideLeft', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value, name) => [
                `${value} days`,
                name === 'estimated' ? 'Estimated' : 'Actual'
              ]}
            />
            <Legend />
            <Bar dataKey="estimated" name="Estimated" fill="hsl(var(--muted-foreground))" opacity={0.5} />
            <Bar dataKey="actual" name="Actual">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry?.bias === 'accurate' ? 'hsl(var(--success))' :
                    entry?.bias === 'underestimate' ? 'hsl(var(--destructive))' :
                    'hsl(var(--primary))'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
