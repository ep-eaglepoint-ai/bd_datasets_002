'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { computeRobustStatisticalSummary } from '@/lib/utils/statistics';
import { StatisticalSummary } from '@/lib/schemas/analytics';

// Extended type for robust statistics
type RobustStatisticalSummary = StatisticalSummary & {
  warnings?: string[];
  sampleSize?: 'small' | 'medium' | 'large';
  isSkewed?: boolean;
  skewness?: number;
};
import { DataImporter } from '@/components/data/DataImporter';
import { DataCleaningPanel } from '@/components/data/DataCleaningPanel';
import { SegmentationPanel } from '@/components/analytics/SegmentationPanel';
import { CrossTabulationView } from '@/components/analytics/CrossTabulationView';
import { RatingScaleAnalysis } from '@/components/analytics/RatingScaleAnalysis';
import { AnnotationAnalysis } from '@/components/analytics/AnnotationAnalysis';
import { ResponseQualityPanel } from '@/components/analytics/ResponseQualityPanel';
import { ResponseMetricsDashboard } from '@/components/analytics/ResponseMetricsDashboard';
import { VisualizationDashboard } from '@/components/analytics/VisualizationDashboard';
import { ResponseFilter } from '@/components/data/ResponseFilter';
import { ResearchInsightsPanel } from '@/components/analytics/ResearchInsightsPanel';
import { SnapshotManager } from '@/components/data/SnapshotManager';
import { DataRecovery } from '@/components/data/DataRecovery';
import { ExportPanel } from '@/components/data/ExportPanel';
import { DataQualityPanel } from '@/components/analytics/DataQualityPanel';
import { StatisticsSummary } from '@/components/analytics/StatisticsSummary';
import { ChartContainer } from '@/components/analytics/ChartContainer';
import { BarChart } from '@/components/analytics/BarChart';
import { PieChart } from '@/components/analytics/PieChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { exportResponsesToCSV, exportResponsesToJSON, generateResearchReport, downloadFile } from '@/lib/utils/export';

export default function SurveyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  const { currentSurvey, responses, annotations, segments, insights, setCurrentSurvey, loadSurveys, loadResponses, loadAnnotations } = useSurveyStore();
  const [summaries, setSummaries] = useState<Map<string, RobustStatisticalSummary>>(new Map());
  const [filteredResponses, setFilteredResponses] = useState<SurveyResponse[]>(responses);

  useEffect(() => {
    const init = async () => {
      await loadSurveys();
      // Find survey by ID from store
      const allSurveys = useSurveyStore.getState().surveys;
      const survey = allSurveys.find(s => s.id === surveyId);
      if (survey) {
        setCurrentSurvey(survey);
      }
    };
    init();
  }, [surveyId, loadSurveys, setCurrentSurvey]);

  useEffect(() => {
    if (currentSurvey?.id === surveyId) {
      loadResponses(surveyId);
      loadAnnotations(); // Load all annotations for analysis
    }
  }, [surveyId, currentSurvey, loadResponses, loadAnnotations]);

  useEffect(() => {
    setFilteredResponses(responses);
  }, [responses]);

  useEffect(() => {
    if (currentSurvey && filteredResponses.length > 0) {
      const newSummaries = new Map<string, RobustStatisticalSummary>();
      currentSurvey.questions.forEach(question => {
        const summary = computeRobustStatisticalSummary(filteredResponses, question.id);
        newSummaries.set(question.id, summary);
      });
      setSummaries(newSummaries);
    }
  }, [currentSurvey, filteredResponses]);

  const handleExportCSV = () => {
    if (!currentSurvey) return;
    const csv = exportResponsesToCSV(responses, currentSurvey);
    downloadFile(csv, `survey-${currentSurvey.id}-responses.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportResponsesToJSON(responses);
    downloadFile(json, `survey-${surveyId}-responses.json`, 'application/json');
  };

  const handleExportReport = () => {
    if (!currentSurvey) return;
    const report = generateResearchReport(currentSurvey, responses, summaries);
    downloadFile(report, `survey-${currentSurvey.id}-report.md`, 'text/markdown');
  };

  if (!currentSurvey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentSurvey.title}</h1>
            {currentSurvey.description && (
              <p className="mt-2 text-gray-600">{currentSurvey.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/surveys')}>
              Back
            </Button>
            <Button variant="primary" onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button variant="primary" onClick={handleExportJSON}>
              Export JSON
            </Button>
            <Button variant="primary" onClick={handleExportReport}>
              Export Report
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Card>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Responses</p>
                <p className="text-2xl font-semibold">{responses.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-2xl font-semibold">{currentSurvey.questions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-semibold">
                  {responses.length > 0
                    ? ((responses.filter(r => r.completed).length / responses.length) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6 space-y-4">
          <DataImporter survey={currentSurvey} />
          <ResponseFilter
            survey={currentSurvey}
            responses={responses}
            annotations={annotations}
            onFilterChange={setFilteredResponses}
          />
          <DataCleaningPanel survey={currentSurvey} responses={filteredResponses} />
          <SegmentationPanel survey={currentSurvey} responses={filteredResponses} />
          <CrossTabulationView survey={currentSurvey} responses={filteredResponses} />
          <RatingScaleAnalysis survey={currentSurvey} responses={filteredResponses} />
          <ResponseQualityPanel
            survey={currentSurvey}
            responses={responses}
            onFilterChange={setFilteredResponses}
          />
          <ResponseMetricsDashboard survey={currentSurvey} responses={filteredResponses} />
          <VisualizationDashboard
            survey={currentSurvey}
            responses={responses}
            segments={segments.filter(s => s.surveyId === currentSurvey.id)}
            filteredResponses={filteredResponses}
          />
          <ResearchInsightsPanel
            survey={currentSurvey}
            segments={segments.filter(s => s.surveyId === currentSurvey.id)}
          />
          <SnapshotManager survey={currentSurvey} />
          <ExportPanel
            survey={currentSurvey}
            responses={filteredResponses}
            summaries={summaries}
            segments={segments.filter(s => s.surveyId === currentSurvey.id)}
            insights={insights.filter(i => i.surveyId === currentSurvey.id)}
            snapshotName={currentSnapshot?.name}
          />
          <DataQualityPanel
            survey={currentSurvey}
            responses={filteredResponses}
            annotations={annotations}
          />
          <DataRecovery />
          {annotations.length > 0 && (
            <AnnotationAnalysis annotations={annotations} responses={filteredResponses} />
          )}
        </div>

        <div className="space-y-6">
          {currentSurvey.questions.map((question, index) => {
            const summary = summaries.get(question.id);
            if (!summary) return null;

            return (
              <div key={question.id} className="space-y-4">
                <StatisticsSummary summary={summary} questionTitle={question.title} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChartContainer title="Bar Chart" description={question.title}>
                    <BarChart data={summary} questionTitle={question.title} />
                  </ChartContainer>
                  {question.type === 'multiple-choice' && (
                    <ChartContainer title="Pie Chart" description={question.title}>
                      <PieChart data={summary} questionTitle={question.title} />
                    </ChartContainer>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
