'use client';

import React, { useState, useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { computeRatingScaleAnalysis } from '@/lib/utils/ratingScaleAnalysis';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RatingScaleAnalysisProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export const RatingScaleAnalysis: React.FC<RatingScaleAnalysisProps> = ({ survey, responses }) => {
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');

  const analysis = useMemo(() => {
    if (selectedQuestions.length === 0) return null;
    try {
      return computeRatingScaleAnalysis(responses, survey, selectedQuestions);
    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    }
  }, [responses, survey, selectedQuestions]);

  const distributionData = useMemo(() => {
    if (!analysis) return [];
    
    const scores = Array.from(analysis.compositeScores.values());
    const bins = 20;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const binWidth = (max - min) / bins;
    
    const binCounts = new Map<number, number>();
    scores.forEach(score => {
      const bin = Math.floor((score - min) / binWidth);
      const binCenter = min + bin * binWidth + binWidth / 2;
      binCounts.set(binCenter, (binCounts.get(binCenter) || 0) + 1);
    });
    
    return Array.from(binCounts.entries())
      .map(([value, count]) => ({ score: value.toFixed(2), frequency: count }))
      .sort((a, b) => parseFloat(a.score) - parseFloat(b.score));
  }, [analysis]);

  return (
    <Card title="Rating Scale Analysis" description="Composite scores, distribution, and response bias">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Rating Scale Questions
          </label>
          <div className="space-y-2">
            {ratingQuestions.map(question => (
              <label key={question.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedQuestions.includes(question.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedQuestions([...selectedQuestions, question.id]);
                    } else {
                      setSelectedQuestions(selectedQuestions.filter(id => id !== question.id));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{question.title}</span>
              </label>
            ))}
          </div>
        </div>

        {analysis && (
          <div className="space-y-4">
            {/* Composite Score Distribution */}
            <div>
              <h3 className="font-semibold mb-2">Composite Score Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Mean</p>
                  <p className="text-xl font-semibold">{analysis.distribution.mean.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Median</p>
                  <p className="text-xl font-semibold">{analysis.distribution.median.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Std Dev</p>
                  <p className="text-xl font-semibold">{analysis.distribution.stdDev.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Range</p>
                  <p className="text-xl font-semibold">
                    {analysis.distribution.min.toFixed(2)} - {analysis.distribution.max.toFixed(2)}
                  </p>
                </div>
              </div>

              {distributionData.length > 0 && (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="score" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="frequency" stroke="#0ea5e9" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Response Bias */}
            <div>
              <h3 className="font-semibold mb-2">Response Bias Indicators</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-yellow-50 rounded">
                  <p className="text-sm text-gray-600">Extreme Response Bias</p>
                  <p className="text-xl font-semibold">
                    {(analysis.responseBias.extremeResponseBias * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Central Tendency Bias</p>
                  <p className="text-xl font-semibold">
                    {(analysis.responseBias.centralTendencyBias * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Acquiescence Bias</p>
                  <p className="text-xl font-semibold">
                    {(analysis.responseBias.acquiescenceBias * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Internal Consistency */}
            {analysis.internalConsistency.alpha !== null && (
              <div>
                <h3 className="font-semibold mb-2">Internal Consistency (Cronbach's Alpha)</h3>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-lg font-semibold">
                    α = {analysis.internalConsistency.alpha.toFixed(3)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {analysis.internalConsistency.alpha >= 0.7
                      ? 'Good internal consistency'
                      : analysis.internalConsistency.alpha >= 0.6
                      ? 'Acceptable internal consistency'
                      : 'Poor internal consistency - consider revising items'}
                  </p>
                  {analysis.internalConsistency.warnings.length > 0 && (
                    <div className="mt-2">
                      {analysis.internalConsistency.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-yellow-600">⚠️ {w}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Invalid Values */}
            {analysis.invalidValues.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-red-600">
                  Invalid Scale Values ({analysis.invalidValues.length})
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {analysis.invalidValues.slice(0, 10).map((inv, i) => (
                    <div key={i} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                      Response {inv.responseId.slice(0, 8)}: {inv.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reversed Scoring Errors */}
            {analysis.reversedScoringErrors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-yellow-600">
                  Potential Reversed Scoring ({analysis.reversedScoringErrors.length})
                </h3>
                <div className="space-y-1">
                  {analysis.reversedScoringErrors.map((error, i) => (
                    <div key={i} className="text-sm text-yellow-600 p-2 bg-yellow-50 rounded">
                      Question may be reversed - detected {error.detectedDirection} correlation
                      when {error.expectedDirection} was expected
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
