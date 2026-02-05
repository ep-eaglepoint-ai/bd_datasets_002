'use client';

import React, { useState, useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { Segment } from '@/lib/schemas/analytics';
import { computeCrossTabulation } from '@/lib/utils/crossTabulation';
import { computeRobustStatisticalSummary } from '@/lib/utils/statistics';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { StackedBarChart } from './StackedBarChart';
import { HeatmapChart } from './HeatmapChart';
import { CorrelationMatrix } from './CorrelationMatrix';
import { SentimentTimeline } from './SentimentTimeline';
import { SubgroupComparison } from './SubgroupComparison';
import { ChartContainer } from './ChartContainer';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

interface VisualizationDashboardProps {
  survey: Survey;
  responses: SurveyResponse[];
  segments?: Segment[];
  filteredResponses?: SurveyResponse[]; // For dynamic updates
}

export const VisualizationDashboard: React.FC<VisualizationDashboardProps> = ({
  survey,
  responses,
  segments = [],
  filteredResponses,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie' | 'stacked' | 'heatmap' | 'correlation' | 'sentiment' | 'subgroup'>('bar');
  const [selectedQuestion1, setSelectedQuestion1] = useState('');
  const [selectedQuestion2, setSelectedQuestion2] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  // Use filtered responses if provided, otherwise use all responses
  const activeResponses = filteredResponses || responses;

  const summaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeRobustStatisticalSummary>>();
    survey.questions.forEach(question => {
      const summary = computeRobustStatisticalSummary(activeResponses, question.id);
      map.set(question.id, summary);
    });
    return map;
  }, [survey, activeResponses]);

  const questionTitles = useMemo(() => {
    const map = new Map<string, string>();
    survey.questions.forEach(q => map.set(q.id, q.title));
    return map;
  }, [survey]);

  const crossTab = useMemo(() => {
    if (!selectedQuestion1 || !selectedQuestion2) return null;
    return computeCrossTabulation(activeResponses, selectedQuestion1, selectedQuestion2);
  }, [activeResponses, selectedQuestion1, selectedQuestion2]);

  const textQuestions = useMemo(() => {
    return survey.questions.filter(q => q.type === 'text').map(q => q.id);
  }, [survey]);

  const numericQuestions = useMemo(() => {
    return survey.questions.filter(q => q.type === 'numeric' || q.type === 'rating-scale').map(q => q.id);
  }, [survey]);

  return (
    <Card title="Visualization Dashboard" description="Dynamic charts that update with filters and segments">
      <div className="space-y-4">
        <Select
          label="Chart Type"
          options={[
            { value: 'bar', label: 'Bar Chart' },
            { value: 'pie', label: 'Pie Chart' },
            { value: 'stacked', label: 'Stacked Bar Chart' },
            { value: 'heatmap', label: 'Heatmap' },
            { value: 'correlation', label: 'Correlation Matrix' },
            { value: 'sentiment', label: 'Sentiment Timeline' },
            { value: 'subgroup', label: 'Subgroup Comparison' },
          ]}
          value={chartType}
          onChange={(e) => setChartType(e.target.value as any)}
        />

        {chartType === 'bar' || chartType === 'pie' ? (
          <Select
            label="Select Question"
            options={survey.questions.map(q => ({
              value: q.id,
              label: q.title,
            }))}
            value={selectedQuestion1}
            onChange={(e) => setSelectedQuestion1(e.target.value)}
          />
        ) : null}

        {chartType === 'stacked' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Questions (multiple)
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {survey.questions.map(question => (
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
        )}

        {chartType === 'heatmap' && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Question 1 (Rows)"
              options={survey.questions.map(q => ({
                value: q.id,
                label: q.title,
              }))}
              value={selectedQuestion1}
              onChange={(e) => setSelectedQuestion1(e.target.value)}
            />
            <Select
              label="Question 2 (Columns)"
              options={survey.questions.map(q => ({
                value: q.id,
                label: q.title,
              }))}
              value={selectedQuestion2}
              onChange={(e) => setSelectedQuestion2(e.target.value)}
            />
          </div>
        )}

        {chartType === 'correlation' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Questions (multiple, numeric only)
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {survey.questions
                .filter(q => numericQuestions.includes(q.id))
                .map(question => (
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
        )}

        {chartType === 'sentiment' && (
          <Select
            label="Select Text Question"
            options={survey.questions
              .filter(q => textQuestions.includes(q.id))
              .map(q => ({
                value: q.id,
                label: q.title,
              }))}
            value={selectedQuestion1}
            onChange={(e) => setSelectedQuestion1(e.target.value)}
          />
        )}

        {chartType === 'subgroup' && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Select Question"
              options={survey.questions.map(q => ({
                value: q.id,
                label: q.title,
              }))}
              value={selectedQuestion1}
              onChange={(e) => setSelectedQuestion1(e.target.value)}
            />
          </div>
        )}

        {/* Render Charts */}
        <div className="mt-4">
          {chartType === 'bar' && selectedQuestion1 && summaries.has(selectedQuestion1) && (
            <ChartContainer title="Bar Chart">
              <BarChart
                data={summaries.get(selectedQuestion1)!}
                questionTitle={questionTitles.get(selectedQuestion1) || selectedQuestion1}
              />
            </ChartContainer>
          )}

          {chartType === 'pie' && selectedQuestion1 && summaries.has(selectedQuestion1) && (
            <ChartContainer title="Pie Chart">
              <PieChart
                data={summaries.get(selectedQuestion1)!}
                questionTitle={questionTitles.get(selectedQuestion1) || selectedQuestion1}
              />
            </ChartContainer>
          )}

          {chartType === 'stacked' && selectedQuestions.length > 0 && (
            <ChartContainer title="Stacked Bar Chart">
              <StackedBarChart
                summaries={new Map(
                  selectedQuestions
                    .filter(id => summaries.has(id))
                    .map(id => [id, summaries.get(id)!])
                )}
                questionTitles={questionTitles}
              />
            </ChartContainer>
          )}

          {chartType === 'heatmap' && crossTab && (
            <ChartContainer title="Heatmap">
              <HeatmapChart crossTab={crossTab} normalize={false} />
            </ChartContainer>
          )}

          {chartType === 'correlation' && selectedQuestions.length >= 2 && (
            <CorrelationMatrix
              survey={survey}
              responses={activeResponses}
              questionIds={selectedQuestions}
            />
          )}

          {chartType === 'sentiment' && selectedQuestion1 && textQuestions.includes(selectedQuestion1) && (
            <SentimentTimeline responses={activeResponses} questionId={selectedQuestion1} />
          )}

          {chartType === 'subgroup' && selectedQuestion1 && segments.length > 0 && (
            <SubgroupComparison
              survey={survey}
              responses={activeResponses}
              segments={segments}
              questionId={selectedQuestion1}
            />
          )}

          {/* Empty state handling */}
          {((chartType === 'bar' || chartType === 'pie') && !selectedQuestion1) ||
          (chartType === 'stacked' && selectedQuestions.length === 0) ||
          (chartType === 'heatmap' && (!selectedQuestion1 || !selectedQuestion2)) ||
          (chartType === 'correlation' && selectedQuestions.length < 2) ||
          (chartType === 'sentiment' && !selectedQuestion1) ||
          (chartType === 'subgroup' && (!selectedQuestion1 || segments.length === 0)) ? (
            <div className="flex items-center justify-center h-64 text-gray-500 border-2 border-dashed rounded">
              Please select the required options to generate the chart
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
};
