'use client';

import React from 'react';
import { StatisticalSummary } from '@/lib/schemas/analytics';
import { Card } from '@/components/ui/Card';
import { UncertaintyIndicator } from '@/components/ui/UncertaintyIndicator';

interface StatisticsSummaryProps {
  summary: StatisticalSummary;
  questionTitle: string;
}

export const StatisticsSummary: React.FC<StatisticsSummaryProps> = ({
  summary,
  questionTitle,
}) => {
  return (
    <Card title={questionTitle}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-600">Count</p>
          <p className="text-2xl font-semibold">{summary.count}</p>
        </div>
        {summary.mean !== null && (
          <div>
            <p className="text-sm text-gray-600">Mean</p>
            <p className="text-2xl font-semibold">{summary.mean.toFixed(2)}</p>
          </div>
        )}
        {summary.median !== null && (
          <div>
            <p className="text-sm text-gray-600">Median</p>
            <p className="text-2xl font-semibold">{summary.median.toFixed(2)}</p>
          </div>
        )}
        {summary.stdDev !== null && (
          <div>
            <p className="text-sm text-gray-600">Std Dev</p>
            <p className="text-2xl font-semibold">{summary.stdDev.toFixed(2)}</p>
          </div>
        )}
        {summary.missing > 0 && (
          <div>
            <p className="text-sm text-gray-600">Missing</p>
            <p className="text-2xl font-semibold text-yellow-600">{summary.missing}</p>
          </div>
        )}
        {summary.min !== null && (
          <div>
            <p className="text-sm text-gray-600">Min</p>
            <p className="text-2xl font-semibold">{summary.min}</p>
          </div>
        )}
        {summary.max !== null && (
          <div>
            <p className="text-sm text-gray-600">Max</p>
            <p className="text-2xl font-semibold">{summary.max}</p>
          </div>
        )}
      </div>

      {summary.confidenceInterval && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg" role="region" aria-label="Confidence interval">
          <p className="text-sm font-medium text-blue-900">
            {summary.confidenceInterval.level * 100}% Confidence Interval
          </p>
          <p className="text-sm text-blue-700">
            [{summary.confidenceInterval.lower.toFixed(2)}, {summary.confidenceInterval.upper.toFixed(2)}]
          </p>
        </div>
      )}

      <div className="mt-4">
        <UncertaintyIndicator summary={summary} questionTitle={questionTitle} />
      </div>
    </Card>
  );
}
