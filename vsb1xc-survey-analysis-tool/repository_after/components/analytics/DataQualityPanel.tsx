'use client';

import React, { useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { Annotation } from '@/lib/schemas/analytics';
import {
  handleSmallSample,
  handleLargeDataset,
  detectContradictions,
  detectBiasedSampling,
  detectAnnotationConflicts,
} from '@/lib/utils/edgeCaseHandling';
import { WarningBadge } from '@/components/ui/WarningBadge';
import { AccessibleCard } from '@/components/ui/AccessibleCard';

interface DataQualityPanelProps {
  survey: Survey;
  responses: SurveyResponse[];
  annotations: Annotation[];
}

export const DataQualityPanel: React.FC<DataQualityPanelProps> = ({
  survey,
  responses,
  annotations,
}) => {
  const qualityChecks = useMemo(() => {
    const checks: Array<{
      category: string;
      warnings: Array<{ type: 'warning' | 'error' | 'info' | 'uncertainty' | 'limitation'; message: string; details?: string }>;
      recommendations: string[];
    }> = [];

    // Small sample check
    survey.questions.forEach(question => {
      const sampleCheck = handleSmallSample(responses, question.id);
      if (sampleCheck.warnings.length > 0) {
        checks.push({
          category: `Question: ${question.title}`,
          warnings: sampleCheck.warnings.map(w => ({
            type: 'uncertainty' as const,
            message: w,
            details: sampleCheck.recommendations.join('; '),
          })),
          recommendations: sampleCheck.recommendations,
        });
      }
    });

    // Large dataset check
    const largeDatasetCheck = handleLargeDataset(responses);
    if (largeDatasetCheck.needsOptimization) {
      checks.push({
        category: 'Dataset Size',
        warnings: [{
          type: 'info',
          message: `Large dataset detected (${responses.length} responses, ~${largeDatasetCheck.estimatedMemoryMB.toFixed(1)}MB)`,
          details: 'Performance optimizations are recommended',
        }],
        recommendations: largeDatasetCheck.recommendations,
      });
    }

    // Biased sampling check
    const biasCheck = detectBiasedSampling(responses, survey);
    if (biasCheck.biases.length > 0) {
      checks.push({
        category: 'Sampling Bias',
        warnings: biasCheck.biases.map(b => ({
          type: b.severity === 'high' ? 'error' : 'warning' as const,
          message: `${b.type}: ${b.description}`,
        })),
        recommendations: biasCheck.recommendations,
      });
    }

    // Contradictions check
    let contradictionCount = 0;
    responses.forEach(response => {
      const contradictions = detectContradictions(response, survey);
      if (contradictions.contradictions.length > 0) {
        contradictionCount++;
      }
    });

    if (contradictionCount > 0) {
      checks.push({
        category: 'Response Contradictions',
        warnings: [{
          type: 'warning',
          message: `${contradictionCount} responses show potential contradictions`,
          details: 'Review flagged responses for data quality issues',
        }],
        recommendations: ['Review contradictory responses manually', 'Consider excluding low-quality responses'],
      });
    }

    // Annotation conflicts
    if (annotations.length > 0) {
      const annotationData = annotations.map(a => ({
        responseId: a.responseId,
        codes: a.codes,
        themes: a.themes,
      }));
      const conflictCheck = detectAnnotationConflicts(annotationData);
      if (conflictCheck.conflicts.length > 0) {
        checks.push({
          category: 'Annotation Conflicts',
          warnings: conflictCheck.conflicts.map(c => ({
            type: 'warning' as const,
            message: `${c.type}: ${c.description}`,
          })),
          recommendations: conflictCheck.recommendations,
        });
      }
    }

    return checks;
  }, [survey, responses, annotations]);

  if (qualityChecks.length === 0) {
    return (
      <AccessibleCard
        title="Data Quality Assessment"
        description="Analysis of data quality and potential issues"
      >
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-800 font-medium">✓ No significant data quality issues detected</p>
        </div>
      </AccessibleCard>
    );
  }

  return (
    <AccessibleCard
      title="Data Quality Assessment"
      description="Analysis of data quality, potential biases, and limitations"
    >
      <div className="space-y-4">
        {qualityChecks.map((check, index) => (
          <div key={index} className="space-y-2">
            <h4 className="font-semibold text-sm">{check.category}</h4>
            {check.warnings.map((warning, wIndex) => (
              <WarningBadge
                key={wIndex}
                type={warning.type}
                message={warning.message}
                details={warning.details}
              />
            ))}
            {check.recommendations.length > 0 && (
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-700 mb-1">Recommendations:</p>
                <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                  {check.recommendations.map((rec, rIndex) => (
                    <li key={rIndex}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </AccessibleCard>
  );
};
