'use client';

import React from 'react';
import { Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CrossTabulation } from '@/lib/schemas/analytics';

interface HeatmapChartProps {
  crossTab: CrossTabulation & { normalizedTable?: number[][] };
  normalize?: boolean;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({ crossTab, normalize = false }) => {
  if (!crossTab.table || crossTab.table.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No data available
      </div>
    );
  }

  const data = crossTab.table.map((row, i) => ({
    rowLabel: crossTab.rowLabels[i],
    ...row.reduce((acc, val, j) => {
      acc[`col_${j}`] = normalize && crossTab.normalizedTable
        ? crossTab.normalizedTable[i][j] * 100
        : val;
      return acc;
    }, {} as Record<string, number>),
  }));

  const maxValue = Math.max(
    ...crossTab.table.flat().map(v => normalize && crossTab.normalizedTable
      ? Math.max(...crossTab.normalizedTable.flat()) * 100
      : v)
  );

  const getColor = (value: number) => {
    const intensity = maxValue > 0 ? value / maxValue : 0;
    const hue = 200 - intensity * 120; // Blue to red gradient
    return `hsl(${hue}, 70%, ${50 + intensity * 20}%)`;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-100"></th>
              {crossTab.columnLabels.map((label, i) => (
                <th key={i} className="border p-2 bg-gray-100 text-xs">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crossTab.table.map((row, i) => (
              <tr key={i}>
                <td className="border p-2 bg-gray-50 font-medium text-xs">
                  {crossTab.rowLabels[i]}
                </td>
                {row.map((cell, j) => {
                  const value = normalize && crossTab.normalizedTable
                    ? crossTab.normalizedTable[i][j] * 100
                    : cell;
                  return (
                    <td
                      key={j}
                      className="border p-2 text-center text-xs"
                      style={{ backgroundColor: getColor(value) }}
                    >
                      {normalize ? `${value.toFixed(1)}%` : cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResponsiveContainer>
  );
};
