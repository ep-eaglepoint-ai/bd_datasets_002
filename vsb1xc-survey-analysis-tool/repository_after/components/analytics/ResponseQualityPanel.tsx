'use client';

import React, { useMemo, useState } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { computeBiasFlags } from '@/lib/utils/biasDetection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

interface ResponseQualityPanelProps {
  survey: Survey;
  responses: SurveyResponse[];
  onFilterChange?: (filteredResponses: SurveyResponse[]) => void;
}

export const ResponseQualityPanel: React.FC<ResponseQualityPanelProps> = ({
  survey,
  responses,
  onFilterChange,
}) => {
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'flagged'>('all');
  const [selectedFlag, setSelectedFlag] = useState<string>('');

  const qualityAnalysis = useMemo(() => {
    const results = responses.map(response => ({
      response,
      flags: computeBiasFlags(response, survey, responses),
    }));

    const highQuality = results.filter(r => r.flags.score >= 0.8);
    const mediumQuality = results.filter(r => r.flags.score >= 0.5 && r.flags.score < 0.8);
    const lowQuality = results.filter(r => r.flags.score < 0.5);
    const flagged = results.filter(r => r.flags.flags.length > 0);

    // Count flags by type
    const flagCounts = new Map<string, number>();
    results.forEach(r => {
      r.flags.flags.forEach(flag => {
        flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
      });
    });

    return {
      results,
      highQuality,
      mediumQuality,
      lowQuality,
      flagged,
      flagCounts: Array.from(flagCounts.entries()).map(([flag, count]) => ({
        flag,
        count,
        proportion: count / responses.length,
      })),
      averageQuality: results.reduce((sum, r) => sum + r.flags.score, 0) / results.length,
    };
  }, [responses, survey]);

  const filteredResponses = useMemo(() => {
    let filtered = qualityAnalysis.results;

    if (qualityFilter === 'high') {
      filtered = filtered.filter(r => r.flags.score >= 0.8);
    } else if (qualityFilter === 'medium') {
      filtered = filtered.filter(r => r.flags.score >= 0.5 && r.flags.score < 0.8);
    } else if (qualityFilter === 'low') {
      filtered = filtered.filter(r => r.flags.score < 0.5);
    } else if (qualityFilter === 'flagged') {
      filtered = filtered.filter(r => r.flags.flags.length > 0);
    }

    if (selectedFlag) {
      filtered = filtered.filter(r => r.flags.flags.includes(selectedFlag));
    }

    return filtered.map(r => r.response);
  }, [qualityAnalysis, qualityFilter, selectedFlag]);

  React.useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filteredResponses);
    }
  }, [filteredResponses, onFilterChange]);

  return (
    <Card
      title="Response Quality Analysis"
      description="Quality flags are provided for review - data is never automatically discarded"
    >
      <div className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-green-50 rounded">
            <p className="text-sm text-gray-600">High Quality</p>
            <p className="text-2xl font-semibold text-green-600">
              {qualityAnalysis.highQuality.length}
            </p>
            <p className="text-xs text-gray-500">
              ({(qualityAnalysis.highQuality.length / responses.length * 100).toFixed(1)}%)
            </p>
          </div>
          <div className="p-3 bg-yellow-50 rounded">
            <p className="text-sm text-gray-600">Medium Quality</p>
            <p className="text-2xl font-semibold text-yellow-600">
              {qualityAnalysis.mediumQuality.length}
            </p>
            <p className="text-xs text-gray-500">
              ({(qualityAnalysis.mediumQuality.length / responses.length * 100).toFixed(1)}%)
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded">
            <p className="text-sm text-gray-600">Low Quality</p>
            <p className="text-2xl font-semibold text-red-600">
              {qualityAnalysis.lowQuality.length}
            </p>
            <p className="text-xs text-gray-500">
              ({(qualityAnalysis.lowQuality.length / responses.length * 100).toFixed(1)}%)
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded">
            <p className="text-sm text-gray-600">Avg Quality Score</p>
            <p className="text-2xl font-semibold text-blue-600">
              {(qualityAnalysis.averageQuality * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Flag Counts */}
        <div>
          <h3 className="font-semibold mb-2">Bias Pattern Detection</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {qualityAnalysis.flagCounts.map(({ flag, count, proportion }) => (
              <div
                key={flag}
                className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                onClick={() => setSelectedFlag(selectedFlag === flag ? '' : flag)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">
                    {flag.replace(/-/g, ' ')}
                  </span>
                  <span className="text-sm text-gray-600">
                    {count} ({(proportion * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Filter by Quality"
            options={[
              { value: 'all', label: 'All Responses' },
              { value: 'high', label: 'High Quality (≥80%)' },
              { value: 'medium', label: 'Medium Quality (50-80%)' },
              { value: 'low', label: 'Low Quality (<50%)' },
              { value: 'flagged', label: 'Flagged Responses' },
            ]}
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value as any)}
          />

          <Select
            label="Filter by Flag Type"
            options={[
              { value: '', label: 'All Flags' },
              ...qualityAnalysis.flagCounts.map(f => ({
                value: f.flag,
                label: `${f.flag.replace(/-/g, ' ')} (${f.count})`,
              })),
            ]}
            value={selectedFlag}
            onChange={(e) => setSelectedFlag(e.target.value)}
          />
        </div>

        {/* Flagged Responses List */}
        {filteredResponses.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">
              {filteredResponses.length} Response{filteredResponses.length !== 1 ? 's' : ''} (
              {qualityFilter !== 'all' ? 'Filtered' : 'Total'})
            </h3>
            {filteredResponses.length > 100 ? (
              <VirtualizedList
                items={filteredResponses}
                height={240}
                itemHeight={80}
                renderItem={(response) => {
                  const analysis = qualityAnalysis.results.find(r => r.response.id === response.id);
                  if (!analysis) return null;

                  return (
                    <div
                      className={`p-3 rounded border mb-2 ${
                        analysis.flags.score >= 0.8
                          ? 'bg-green-50 border-green-200'
                          : analysis.flags.score >= 0.5
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">
                            Response {response.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-600">
                            Quality Score: {(analysis.flags.score * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.flags.flags.map(flag => (
                            <span
                              key={flag}
                              className="px-2 py-1 bg-white rounded text-xs capitalize"
                            >
                              {flag.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredResponses.map(response => {
                  const analysis = qualityAnalysis.results.find(r => r.response.id === response.id);
                  if (!analysis) return null;

                  return (
                    <div
                      key={response.id}
                      className={`p-3 rounded border ${
                        analysis.flags.score >= 0.8
                          ? 'bg-green-50 border-green-200'
                          : analysis.flags.score >= 0.5
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">
                            Response {response.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-gray-600">
                            Quality Score: {(analysis.flags.score * 100).toFixed(0)}%
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.flags.flags.map(flag => (
                            <span
                              key={flag}
                              className="px-2 py-1 bg-white rounded text-xs capitalize"
                            >
                              {flag.replace(/-/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Important Notice */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm font-medium text-blue-900">
            ⓘ Quality Flags for Review
          </p>
          <p className="text-xs text-blue-700 mt-1">
            All responses are preserved. Quality flags help identify potential issues but do not
            automatically exclude data. Review flagged responses and decide whether to include
            them in your analysis.
          </p>
        </div>
      </div>
    </Card>
  );
};
