'use client';

import React, { useState, useMemo } from 'react';
import { Survey } from '@/lib/schemas/survey';
import { SurveyResponse } from '@/lib/schemas/survey';
import { computeCrossTabulation } from '@/lib/utils/crossTabulation';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

interface CrossTabulationViewProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export const CrossTabulationView: React.FC<CrossTabulationViewProps> = ({
  survey,
  responses,
}) => {
  const [questionId1, setQuestionId1] = useState('');
  const [questionId2, setQuestionId2] = useState('');
  const [normalize, setNormalize] = useState<'none' | 'row' | 'column' | 'total'>('none');

  const crossTab = useMemo(() => {
    if (!questionId1 || !questionId2) return null;
    return computeCrossTabulation(responses, questionId1, questionId2, {
      normalize,
      minCellSize: 5,
    });
  }, [responses, questionId1, questionId2, normalize]);

  return (
    <Card title="Cross-Tabulation Analysis">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Question 1 (Rows)"
            options={survey.questions.map(q => ({
              value: q.id,
              label: q.title,
            }))}
            value={questionId1}
            onChange={(e) => setQuestionId1(e.target.value)}
          />

          <Select
            label="Question 2 (Columns)"
            options={survey.questions.map(q => ({
              value: q.id,
              label: q.title,
            }))}
            value={questionId2}
            onChange={(e) => setQuestionId2(e.target.value)}
          />
        </div>

        <Select
          label="Normalization"
          options={[
            { value: 'none', label: 'None (Counts)' },
            { value: 'row', label: 'Row Percentages' },
            { value: 'column', label: 'Column Percentages' },
            { value: 'total', label: 'Total Percentages' },
          ]}
          value={normalize}
          onChange={(e) => setNormalize(e.target.value as any)}
        />

        {crossTab && (
          <div className="mt-4">
            {crossTab.warnings.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded">
                <p className="font-medium text-yellow-800 mb-2">Warnings:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {crossTab.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {crossTab.table.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-2 bg-gray-100"></th>
                      {crossTab.columnLabels.map((label, i) => (
                        <th key={i} className="border border-gray-300 p-2 bg-gray-100">
                          {label}
                        </th>
                      ))}
                      <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossTab.table.map((row, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 p-2 bg-gray-50 font-medium">
                          {crossTab.rowLabels[i]}
                        </td>
                        {row.map((cell, j) => (
                          <td key={j} className="border border-gray-300 p-2 text-center">
                            {normalize === 'none'
                              ? cell
                              : crossTab.normalizedTable
                              ? (crossTab.normalizedTable[i][j] * 100).toFixed(1) + '%'
                              : cell}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-2 bg-gray-50 font-semibold text-center">
                          {crossTab.rowTotals[i]}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border border-gray-300 p-2 bg-gray-50 font-semibold">
                        Total
                      </td>
                      {crossTab.columnTotals.map((total, i) => (
                        <td
                          key={i}
                          className="border border-gray-300 p-2 bg-gray-50 font-semibold text-center"
                        >
                          {total}
                        </td>
                      ))}
                      <td className="border border-gray-300 p-2 bg-gray-100 font-bold text-center">
                        {crossTab.grandTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {crossTab.chiSquare !== null && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm">
                  <strong>Chi-square:</strong> {crossTab.chiSquare.toFixed(4)}
                </p>
                {crossTab.pValue !== null && (
                  <p className="text-sm">
                    <strong>p-value:</strong> {crossTab.pValue.toFixed(4)}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {crossTab.isValid
                    ? 'Statistical test is valid'
                    : 'Statistical test may not be reliable - see warnings'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
