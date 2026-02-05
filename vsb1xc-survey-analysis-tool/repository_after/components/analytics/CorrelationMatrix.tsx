'use client';

import React, { useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { Card } from '@/components/ui/Card';

interface CorrelationMatrixProps {
  survey: Survey;
  responses: SurveyResponse[];
  questionIds: string[];
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  survey,
  responses,
  questionIds,
}) => {
  const matrix = useMemo(() => {
    const questions = survey.questions.filter(q => questionIds.includes(q.id));
    const correlations: Array<Array<number | null>> = [];

    questions.forEach((q1, i) => {
      const row: Array<number | null> = [];
      questions.forEach((q2, j) => {
        if (i === j) {
          row.push(1.0);
        } else {
          // Extract values for both questions
          const values1: number[] = [];
          const values2: number[] = [];

          responses.forEach(response => {
            const res1 = response.responses.find(r => r.questionId === q1.id);
            const res2 = response.responses.find(r => r.questionId === q2.id);

            if (res1 && res2 && typeof res1.value === 'number' && typeof res2.value === 'number') {
              values1.push(res1.value);
              values2.push(res2.value);
            }
          });

          if (values1.length >= 3 && values1.length === values2.length) {
            // Compute Pearson correlation
            const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
            const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

            let numerator = 0;
            let sumSq1 = 0;
            let sumSq2 = 0;

            for (let k = 0; k < values1.length; k++) {
              const diff1 = values1[k] - mean1;
              const diff2 = values2[k] - mean2;
              numerator += diff1 * diff2;
              sumSq1 += diff1 * diff1;
              sumSq2 += diff2 * diff2;
            }

            const denominator = Math.sqrt(sumSq1 * sumSq2);
            const correlation = denominator > 0 ? numerator / denominator : null;
            row.push(correlation);
          } else {
            row.push(null);
          }
        }
      });
      correlations.push(row);
    });

    return { correlations, questions };
  }, [survey, responses, questionIds]);

  const getColor = (value: number | null) => {
    if (value === null) return '#e5e7eb';
    if (value >= 0.7) return '#10b981'; // Strong positive
    if (value >= 0.3) return '#3b82f6'; // Moderate positive
    if (value >= -0.3) return '#fbbf24'; // Weak
    if (value >= -0.7) return '#f97316'; // Moderate negative
    return '#ef4444'; // Strong negative
  };

  if (matrix.correlations.length === 0) {
    return (
      <Card title="Correlation Matrix">
        <div className="flex items-center justify-center h-64 text-gray-500">
          No numeric data available for correlation
        </div>
      </Card>
    );
  }

  return (
    <Card title="Correlation Matrix">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-100"></th>
              {matrix.questions.map((q, i) => (
                <th key={i} className="border p-2 bg-gray-100 text-xs">
                  Q{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.correlations.map((row, i) => (
              <tr key={i}>
                <td className="border p-2 bg-gray-50 font-medium text-xs">
                  Q{i + 1}
                </td>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="border p-2 text-center text-xs"
                    style={{ backgroundColor: getColor(cell) }}
                  >
                    {cell !== null ? cell.toFixed(2) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500"></div>
          <span>Strong Positive (≥0.7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500"></div>
          <span>Moderate Positive (0.3-0.7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500"></div>
          <span>Weak (-0.3 to 0.3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500"></div>
          <span>Moderate Negative (-0.7 to -0.3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span>Strong Negative (≤-0.7)</span>
        </div>
      </div>
    </Card>
  );
};
