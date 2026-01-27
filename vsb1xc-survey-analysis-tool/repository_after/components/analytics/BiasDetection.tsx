'use client';

import React, { useMemo } from 'react';
import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { computeBiasFlags } from '@/lib/utils/biasDetection';
import { Card } from '@/components/ui/Card';

interface BiasDetectionProps {
  responses: SurveyResponse[];
  survey: Survey;
}

export const BiasDetection: React.FC<BiasDetectionProps> = ({
  responses,
  survey,
}) => {
  const biasResults = useMemo(() => {
    return responses.map(response => ({
      response,
      flags: computeBiasFlags(response, survey, responses),
    }));
  }, [responses, survey]);

  const summary = useMemo(() => {
    const total = biasResults.length;
    const straightLining = biasResults.filter(r => r.flags.straightLining).length;
    const randomAnswering = biasResults.filter(r => r.flags.randomAnswering).length;
    const duplicates = biasResults.filter(r => r.flags.duplicateSubmission).length;
    const extremeBias = biasResults.filter(r => r.flags.extremeResponseBias).length;
    const inconsistent = biasResults.filter(r => r.flags.inconsistentAnswers).length;
    const unusuallyFast = biasResults.filter(r => r.flags.unusuallyFast).length;
    const avgQualityScore =
      biasResults.reduce((sum, r) => sum + r.flags.score, 0) / total;

    return {
      total,
      straightLining,
      randomAnswering,
      duplicates,
      extremeBias,
      inconsistent,
      unusuallyFast,
      avgQualityScore,
    };
  }, [biasResults]);

  return (
    <Card title="Response Quality & Bias Detection">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Avg Quality Score</p>
            <p className={`text-2xl font-semibold ${
              summary.avgQualityScore > 0.7
                ? 'text-green-600'
                : summary.avgQualityScore > 0.4
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}>
              {(summary.avgQualityScore * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Straight-lining</p>
            <p className="text-2xl font-semibold text-yellow-600">
              {summary.straightLining}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Random Answering</p>
            <p className="text-2xl font-semibold text-yellow-600">
              {summary.randomAnswering}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duplicates</p>
            <p className="text-2xl font-semibold text-red-600">
              {summary.duplicates}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Flagged Responses</p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {biasResults
              .filter(r => r.flags.flags.length > 0)
              .slice(0, 20)
              .map(({ response, flags }) => (
                <div
                  key={response.id}
                  className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium">Response {response.id.slice(0, 8)}</span>
                    <span className="text-xs text-gray-500">
                      Quality: {(flags.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {flags.flags.map(flag => (
                      <span
                        key={flag}
                        className="px-1 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
