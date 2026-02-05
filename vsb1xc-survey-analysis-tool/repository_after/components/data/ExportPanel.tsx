'use client';

import React, { useState } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { Segment, ResearchInsight } from '@/lib/schemas/analytics';
import { StatisticalSummary } from '@/lib/schemas/analytics';
import {
  exportResponsesToCSV,
  exportResponsesToJSON,
  exportSegmentToCSV,
  exportAnalyticalSummary,
  exportResearchNotes,
  generateComprehensiveReport,
  downloadFile,
} from '@/lib/utils/export';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

interface ExportPanelProps {
  survey: Survey;
  responses: SurveyResponse[];
  summaries: Map<string, StatisticalSummary>;
  segments?: Segment[];
  insights?: ResearchInsight[];
  snapshotName?: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  survey,
  responses,
  summaries,
  segments = [],
  insights = [],
  snapshotName,
}) => {
  const [exportType, setExportType] = useState<'responses' | 'segment' | 'summary' | 'notes' | 'report'>('responses');
  const [format, setFormat] = useState<'csv' | 'json' | 'markdown'>('csv');
  const [selectedSegment, setSelectedSegment] = useState<string>('');

  const handleExport = () => {
    let content = '';
    let filename = '';
    let mimeType = '';

    try {
      switch (exportType) {
        case 'responses': {
          if (format === 'csv') {
            content = exportResponsesToCSV(responses, survey, {
              includeMetadata: true,
              precision: 10,
              includeTimestamps: true,
            });
            filename = `${survey.title}-responses-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
          } else {
            content = exportResponsesToJSON(responses, {
              includeSchema: true,
              precision: 10,
            });
            filename = `${survey.title}-responses-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
          }
          break;
        }

        case 'segment': {
          if (!selectedSegment) {
            alert('Please select a segment');
            return;
          }
          const segment = segments.find(s => s.id === selectedSegment);
          if (!segment) {
            alert('Segment not found');
            return;
          }
          content = exportSegmentToCSV(responses, survey, segment);
          filename = `${survey.title}-segment-${segment.name}-${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        }

        case 'summary': {
          if (format === 'csv') {
            content = exportAnalyticalSummary(summaries, survey, 'csv');
            filename = `${survey.title}-summary-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
          } else {
            content = exportAnalyticalSummary(summaries, survey, 'json');
            filename = `${survey.title}-summary-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
          }
          break;
        }

        case 'notes': {
          if (format === 'markdown') {
            content = exportResearchNotes(insights, 'markdown');
            filename = `${survey.title}-notes-${new Date().toISOString().split('T')[0]}.md`;
            mimeType = 'text/markdown';
          } else if (format === 'csv') {
            content = exportResearchNotes(insights, 'csv');
            filename = `${survey.title}-notes-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
          } else {
            content = exportResearchNotes(insights, 'json');
            filename = `${survey.title}-notes-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
          }
          break;
        }

        case 'report': {
          content = generateComprehensiveReport(
            survey,
            responses,
            summaries,
            snapshotName ? { id: snapshotName, name: snapshotName } as any : undefined,
            insights,
            segments
          );
          filename = `${survey.title}-report-${new Date().toISOString().split('T')[0]}.md`;
          mimeType = 'text/markdown';
          break;
        }
      }

      downloadFile(content, filename, mimeType);
      alert('Export completed successfully');
    } catch (error) {
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card title="Export Data" description="Export datasets, summaries, and reports with full precision and traceability">
      <div className="space-y-4">
        <Select
          label="Export Type"
          options={[
            { value: 'responses', label: 'All Responses' },
            { value: 'segment', label: 'Segmented Subset' },
            { value: 'summary', label: 'Analytical Summary' },
            { value: 'notes', label: 'Research Notes' },
            { value: 'report', label: 'Comprehensive Report' },
          ]}
          value={exportType}
          onChange={(e) => setExportType(e.target.value as any)}
        />

        {exportType !== 'report' && (
          <Select
            label="Format"
            options={[
              { value: 'csv', label: 'CSV' },
              { value: 'json', label: 'JSON' },
              ...(exportType === 'notes' ? [{ value: 'markdown', label: 'Markdown' }] : []),
            ]}
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
          />
        )}

        {exportType === 'segment' && (
          <Select
            label="Select Segment"
            options={[
              { value: '', label: 'Select a segment...' },
              ...segments.map(s => ({
                value: s.id,
                label: s.name,
              })),
            ]}
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
          />
        )}

        <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
          <p className="font-medium mb-1">Export Features:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Full numeric precision (10 decimal places)</li>
            <li>Schema integrity preserved</li>
            <li>ISO 8601 timestamp format</li>
            <li>Complete analysis traceability</li>
            <li>Metadata and cleaning history included</li>
          </ul>
        </div>

        <Button variant="primary" onClick={handleExport}>
          Export {exportType === 'report' ? 'Report' : format.toUpperCase()}
        </Button>
      </div>
    </Card>
  );
};
