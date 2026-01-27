'use client';

import React, { useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import {
  computeResponseQualityMetrics,
  analyzeCompletionFlow,
  identifyDropoutPoints,
  computeItemNonResponseRates,
} from '@/lib/utils/responseMetrics';
import { Card } from '@/components/ui/Card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ResponseMetricsDashboardProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export const ResponseMetricsDashboard: React.FC<ResponseMetricsDashboardProps> = ({
  survey,
  responses,
}) => {
  const metrics = useMemo(() => {
    return computeResponseQualityMetrics(responses, survey);
  }, [responses, survey]);

  const completionFlow = useMemo(() => {
    return analyzeCompletionFlow(responses, survey);
  }, [responses, survey]);

  const dropoutPoints = useMemo(() => {
    return identifyDropoutPoints(responses, survey);
  }, [responses, survey]);

  const nonResponseRates = useMemo(() => {
    return computeItemNonResponseRates(responses, survey);
  }, [responses, survey]);

  const engagementData = useMemo(() => {
    return metrics.engagementCurve?.map((point, index) => {
      const question = survey.questions.find(q => q.id === point.questionId);
      return {
        question: `Q${index + 1}`,
        questionTitle: question?.title || point.questionId,
        responseRate: metrics.engagementCurve
          ? responses.filter(r => 
              r.responses.some(res => res.questionId === point.questionId && res.value !== null)
            ).length / responses.length
          : 0,
        avgTime: point.responseTime / 1000, // Convert to seconds
      };
    }) || [];
  }, [metrics, responses, survey]);

  const dropoutData = useMemo(() => {
    return Array.from(dropoutPoints.values())
      .map(data => ({
        question: data.questionTitle,
        dropoutRate: data.dropoutRate * 100,
        dropoutCount: data.dropoutCount,
      }))
      .sort((a, b) => b.dropoutRate - a.dropoutRate)
      .slice(0, 10);
  }, [dropoutPoints]);

  const nonResponseData = useMemo(() => {
    return Array.from(nonResponseRates.values())
      .map(data => ({
        question: data.questionTitle,
        nonResponseRate: data.nonResponseRate * 100,
        nonResponseCount: data.nonResponseCount,
      }))
      .sort((a, b) => b.nonResponseRate - a.nonResponseRate);
  }, [nonResponseRates]);

  return (
    <div className="space-y-4">
      <Card title="Response Quality Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Completion Rate</p>
            <p className="text-2xl font-semibold">
              {(metrics.completionRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Response Time</p>
            <p className="text-2xl font-semibold">
              {metrics.averageResponseTime > 0
                ? `${(metrics.averageResponseTime / 1000).toFixed(1)}s`
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Item Non-Response</p>
            <p className="text-2xl font-semibold">
              {(metrics.itemNonResponseRate * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Partial Submissions</p>
            <p className="text-2xl font-semibold text-yellow-600">
              {completionFlow.partialSubmissions.length}
            </p>
          </div>
        </div>

        {metrics.dropoutPoint && (
          <div className="mt-4 p-3 bg-yellow-50 rounded">
            <p className="text-sm font-medium text-yellow-800">
              Primary Dropout Point: {survey.questions.find(q => q.id === metrics.dropoutPoint)?.title || metrics.dropoutPoint}
            </p>
          </div>
        )}
      </Card>

      {/* Engagement Curve */}
      {engagementData.length > 0 && (
        <Card title="Engagement Curve">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="question" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="responseRate"
                  stroke="#0ea5e9"
                  name="Response Rate"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgTime"
                  stroke="#f43f5e"
                  name="Avg Time (s)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Dropout Points */}
      {dropoutData.length > 0 && (
        <Card title="Dropout Points">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dropoutData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="question" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="dropoutRate" fill="#f43f5e" name="Dropout Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Non-Response Rates */}
      {nonResponseData.length > 0 && (
        <Card title="Item Non-Response Rates">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={nonResponseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="question" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="nonResponseRate" fill="#f59e0b" name="Non-Response Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Completion Patterns */}
      {completionFlow.completionPatterns.length > 0 && (
        <Card title="Completion Patterns">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {completionFlow.completionPatterns.slice(0, 10).map((pattern, index) => (
              <div key={index} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                <span className="font-mono text-sm">{pattern.pattern}</span>
                <span className="text-sm text-gray-600">{pattern.count} responses</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Irregular Flows */}
      {completionFlow.irregularFlows.length > 0 && (
        <Card title="Irregular Completion Flows">
          <div className="max-h-60 overflow-y-auto space-y-2">
            {completionFlow.irregularFlows.slice(0, 20).map((flow, index) => (
              <div key={index} className="p-2 bg-yellow-50 rounded">
                <p className="text-sm font-medium">Response {flow.responseId.slice(0, 8)}</p>
                <ul className="text-xs text-yellow-700 list-disc list-inside">
                  {flow.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
