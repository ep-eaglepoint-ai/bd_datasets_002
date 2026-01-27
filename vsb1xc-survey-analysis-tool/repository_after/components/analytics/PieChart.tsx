'use client';

import React from 'react';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatisticalSummary } from '@/lib/schemas/analytics';

interface PieChartProps {
  data: StatisticalSummary;
  questionTitle: string;
}

const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export const PieChart: React.FC<PieChartProps> = ({ data, questionTitle }) => {
  if (!data.frequencyDistribution || data.frequencyDistribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  const chartData = data.frequencyDistribution.map(item => ({
    name: String(item.value),
    value: item.count,
    proportion: (item.proportion * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, proportion }) => `${name}: ${proportion}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
