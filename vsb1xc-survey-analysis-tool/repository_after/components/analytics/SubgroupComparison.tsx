'use client';

import React, { useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { Segment } from '@/lib/schemas/analytics';
import { compareSegments } from '@/lib/utils/segmentation';
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
import { Card } from '@/components/ui/Card';

interface SubgroupComparisonProps {
  survey: Survey;
  responses: SurveyResponse[];
  segments: Segment[];
  questionId: string;
}

export const SubgroupComparison: React.FC<SubgroupComparisonProps> = ({
  survey,
  responses,
  segments,
  questionId,
}) => {
  const comparison = useMemo(() => {
    if (segments.length === 0) return null;
    return compareSegments(segments, responses, survey, questionId);
  }, [segments, responses, survey, questionId]);

  const chartData = useMemo(() => {
    if (!comparison) return [];

    return comparison.comparisons[0]?.segmentComparisons.map(segComp => ({
      segment: segComp.segmentName,
      mean: segComp.mean,
      median: segComp.median,
      proportion: segComp.proportion,
    })) || [];
  }, [comparison]);

  if (!comparison || chartData.length === 0) {
    return (
      <Card title="Subgroup Comparison">
        <div className="flex items-center justify-center h-64 text-gray-500">
          No segments available for comparison
        </div>
      </Card>
    );
  }

  const question = survey.questions.find(q => q.id === questionId);
  const isNumeric = question?.type === 'numeric' || question?.type === 'rating-scale';

  return (
    <Card title={`Subgroup Comparison: ${question?.title || questionId}`}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="segment" />
            <YAxis />
            <Tooltip />
            <Legend />
            {isNumeric ? (
              <>
                <Bar dataKey="mean" fill="#0ea5e9" name="Mean" />
                <Bar dataKey="median" fill="#3b82f6" name="Median" />
              </>
            ) : (
              <Bar dataKey="proportion" fill="#0ea5e9" name="Proportion" />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
