'use client';

import React, { useMemo } from 'react';
import { Annotation } from '@/lib/schemas/analytics';
import { SurveyResponse } from '@/lib/schemas/survey';
import {
  analyzeAnnotationPatterns,
  computeThemeCoOccurrence,
} from '@/lib/utils/annotationAnalysis';
import { Card } from '@/components/ui/Card';

interface AnnotationAnalysisProps {
  annotations: Annotation[];
  responses: SurveyResponse[];
}

export const AnnotationAnalysis: React.FC<AnnotationAnalysisProps> = ({
  annotations,
  responses,
}) => {
  const analysis = useMemo(() => {
    return analyzeAnnotationPatterns(annotations, responses);
  }, [annotations, responses]);

  const coOccurrences = useMemo(() => {
    return computeThemeCoOccurrence(annotations);
  }, [annotations]);

  return (
    <div className="space-y-4">
      <Card title="Annotation Coverage">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Annotated</p>
            <p className="text-2xl font-semibold">{analysis.coverage.annotated}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Responses</p>
            <p className="text-2xl font-semibold">{analysis.coverage.total}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Coverage Rate</p>
            <p className="text-2xl font-semibold">
              {(analysis.coverage.coverageRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      <Card title="Theme Frequency">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {analysis.themeFrequency.map(theme => (
            <div key={theme.theme} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium">{theme.theme}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">{theme.frequency} occurrences</span>
                <span className="text-gray-600">
                  {(theme.proportion * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          {analysis.themeFrequency.length === 0 && (
            <p className="text-gray-500 text-center py-4">No themes found</p>
          )}
        </div>
      </Card>

      <Card title="Code Frequency">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {analysis.codeFrequency.map(code => (
            <div key={code.code} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium">{code.code}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">{code.frequency} occurrences</span>
                <span className="text-gray-600">
                  {(code.proportion * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          {analysis.codeFrequency.length === 0 && (
            <p className="text-gray-500 text-center py-4">No codes found</p>
          )}
        </div>
      </Card>

      <Card title="Theme Co-Occurrence">
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {coOccurrences.slice(0, 20).map((co, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{co.theme1}</span>
                  <span className="mx-2">×</span>
                  <span className="font-medium">{co.theme2}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {co.coOccurrenceCount} times (
                  {(co.coOccurrenceRate * 100).toFixed(1)}% of {co.theme1})
                </div>
              </div>
            </div>
          ))}
          {coOccurrences.length === 0 && (
            <p className="text-gray-500 text-center py-4">No co-occurrences found</p>
          )}
        </div>
      </Card>
    </div>
  );
};
