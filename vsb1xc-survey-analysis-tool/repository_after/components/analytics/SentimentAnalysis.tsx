'use client';

import React, { useMemo } from 'react';
import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { computeEnhancedSentiment } from '@/lib/utils/enhancedTextAnalysis';
import { extractEnhancedThemes, clusterEnhancedResponses } from '@/lib/utils/enhancedTextAnalysis';
import { Card } from '@/components/ui/Card';

interface SentimentAnalysisProps {
  responses: SurveyResponse[];
  survey: Survey;
  questionId: string;
}

export const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({
  responses,
  survey,
  questionId,
}) => {
  const sentimentResults = useMemo(() => {
    const results = new Map<string, ReturnType<typeof computeEnhancedSentiment>>();
    responses.forEach(response => {
      const textResponse = response.responses.find(r => 
        r.questionId === questionId && typeof r.value === 'string'
      );
      if (textResponse && typeof textResponse.value === 'string') {
        const sentiment = computeEnhancedSentiment(textResponse.value);
        results.set(response.id, sentiment);
      }
    });
    return results;
  }, [responses, questionId]);

  const themes = useMemo(() => {
    return extractEnhancedThemes(responses, questionId, 2);
  }, [responses, questionId]);

  const sentimentStats = useMemo(() => {
    const results = Array.from(sentimentResults.values());
    const positive = results.filter(r => r.label === 'positive').length;
    const negative = results.filter(r => r.label === 'negative').length;
    const neutral = results.filter(r => r.label === 'neutral').length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return { positive, negative, neutral, avgScore, total: results.length };
  }, [sentimentResults]);

  return (
    <div className="space-y-4">
      <Card title="Sentiment Analysis">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Positive</p>
            <p className="text-2xl font-semibold text-green-600">{sentimentStats.positive}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Negative</p>
            <p className="text-2xl font-semibold text-red-600">{sentimentStats.negative}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Neutral</p>
            <p className="text-2xl font-semibold text-gray-600">{sentimentStats.neutral}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Score</p>
            <p className="text-2xl font-semibold">
              {sentimentStats.avgScore.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Top Keywords</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(sentimentResults.values())
              .flatMap(r => r.keywords)
              .slice(0, 10)
              .map((keyword, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 rounded text-sm ${
                    keyword.sentiment && keyword.sentiment > 0
                      ? 'bg-green-100 text-green-800'
                      : keyword.sentiment && keyword.sentiment < 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {keyword.word} ({keyword.frequency})
                </span>
              ))}
          </div>
          {Array.from(sentimentResults.values()).some(r => r.isSarcastic) && (
            <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
              ⚠️ Sarcasm detected in some responses - sentiment scores may be adjusted
            </div>
          )}
        </div>
      </Card>

      {themes.themes.length > 0 && (
        <Card title="Themes">
          <div className="space-y-2">
            {themes.themes.slice(0, 10).map(theme => (
              <div key={theme.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{theme.label}</span>
                <span className="text-sm text-gray-600">
                  {theme.frequency} occurrences
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
