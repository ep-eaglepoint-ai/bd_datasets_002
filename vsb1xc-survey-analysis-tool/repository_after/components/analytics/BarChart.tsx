'use client';

import React from 'react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatisticalSummary } from '@/lib/schemas/analytics';

interface BarChartProps {
  data: StatisticalSummary;
  questionTitle: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, questionTitle }) => {
  if (!data.frequencyDistribution || data.frequencyDistribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  const chartData = data.frequencyDistribution.map(item => ({
    value: String(item.value),
    count: item.count,
    proportion: (item.proportion * 100).toFixed(1),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsBarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="value" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#0ea5e9" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
