'use client';

import React from 'react';
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
import { StatisticalSummary } from '@/lib/schemas/analytics';

interface StackedBarChartProps {
  summaries: Map<string, StatisticalSummary>;
  questionTitles: Map<string, string>;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  summaries,
  questionTitles,
}) => {
  if (summaries.size === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  // Get all unique values across all questions
  const allValues = new Set<string>();
  summaries.forEach(summary => {
    summary.frequencyDistribution?.forEach(item => {
      allValues.add(String(item.value));
    });
  });

  const chartData = Array.from(allValues).map(value => {
    const dataPoint: Record<string, string | number> = { value };
    summaries.forEach((summary, questionId) => {
      const distItem = summary.frequencyDistribution?.find(
        item => String(item.value) === value
      );
      dataPoint[questionTitles.get(questionId) || questionId] = distItem?.count || 0;
    });
    return dataPoint;
  });

  const colors = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="value" />
        <YAxis />
        <Tooltip />
        <Legend />
        {Array.from(summaries.keys()).map((questionId, index) => (
          <Bar
            key={questionId}
            dataKey={questionTitles.get(questionId) || questionId}
            stackId="a"
            fill={colors[index % colors.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
