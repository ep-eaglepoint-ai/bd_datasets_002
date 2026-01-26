'use client';

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useGoalStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';

const COLORS = [
  'hsl(var(--primary))', 
  'hsl(var(--secondary))', 
  'hsl(var(--accent))', 
  'hsl(var(--destructive))', 
  '#10b981', // emerald
  '#f59e0b'  // amber
];

export function GoalStateDistributionChart() {
  const { goals } = useGoalStore();
  
  const data = useMemo(() => {
    const counts = goals.reduce((acc, goal) => {
      acc[goal.state] = (acc[goal.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).map(([state, count]) => ({
      name: state.charAt(0).toUpperCase() + state.slice(1),
      value: count,
    })).sort((a, b) => b.value - a.value);
  }, [goals]);
  
  if (data.length === 0) {
    return (
      <Card variant="glass" className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </Card>
    );
  }
  
  return (
    <Card variant="glass" className="h-[300px] flex flex-col">
      <div className="mb-2">
        <h3 className="text-lg font-semibold tracking-tight">Status Distribution</h3>
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              verticalAlign="middle" 
              align="right"
              layout="vertical"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', opacity: 0.8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
