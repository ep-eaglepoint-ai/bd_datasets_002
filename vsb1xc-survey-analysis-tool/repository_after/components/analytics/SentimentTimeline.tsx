'use client';

import React, { useMemo } from 'react';
import { SurveyResponse } from '@/lib/schemas/survey';
import { computeEnhancedSentiment } from '@/lib/utils/enhancedTextAnalysis';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/Card';

interface SentimentTimelineProps {
  responses: SurveyResponse[];
  questionId: string;
}

export const SentimentTimeline: React.FC<SentimentTimelineProps> = ({
  responses,
  questionId,
}) => {
  const timelineData = useMemo(() => {
    const textResponses = responses
      .map(response => {
        const textRes = response.responses.find(
          r => r.questionId === questionId && typeof r.value === 'string'
        );
        if (!textRes || typeof textRes.value !== 'string') return null;

        const sentiment = computeEnhancedSentiment(textRes.value);
        return {
          date: new Date(response.submittedAt).toLocaleDateString(),
          timestamp: new Date(response.submittedAt).getTime(),
          sentiment: sentiment.score,
          label: sentiment.label,
          responseId: response.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Group by date and compute average sentiment
    const grouped = new Map<string, { date: string; avgSentiment: number; count: number }>();
    
    textResponses.forEach(item => {
      const existing = grouped.get(item.date);
      if (existing) {
        existing.avgSentiment = (existing.avgSentiment * existing.count + item.sentiment) / (existing.count + 1);
        existing.count++;
      } else {
        grouped.set(item.date, {
          date: item.date,
          avgSentiment: item.sentiment,
          count: 1,
        });
      }
    });

    return Array.from(grouped.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [responses, questionId]);

  if (timelineData.length === 0) {
    return (
      <Card title="Sentiment Timeline">
        <div className="flex items-center justify-center h-64 text-gray-500">
          No text responses available
        </div>
      </Card>
    );
  }

  return (
    <Card title="Sentiment Timeline">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[-1, 1]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="avgSentiment"
              stroke="#0ea5e9"
              name="Average Sentiment"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#f43f5e"
              name="Response Count"
              yAxisId="right"
            />
            <YAxis yAxisId="right" orientation="right" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
