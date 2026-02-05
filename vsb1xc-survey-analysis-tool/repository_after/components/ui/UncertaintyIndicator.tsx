'use client';

import React from 'react';
import { StatisticalSummary } from '@/lib/schemas/analytics';
import { WarningBadge } from './WarningBadge';

interface UncertaintyIndicatorProps {
  summary: StatisticalSummary & { warnings?: string[]; sampleSize?: 'small' | 'medium' | 'large' };
  questionTitle: string;
}

export const UncertaintyIndicator: React.FC<UncertaintyIndicatorProps> = ({
  summary,
  questionTitle,
}) => {
  const warnings: Array<{ type: 'warning' | 'error' | 'info' | 'uncertainty' | 'limitation'; message: string; details?: string }> = [];

  // Small sample size warning
  if (summary.sampleSize === 'small' || summary.count < 30) {
    warnings.push({
      type: 'uncertainty',
      message: 'Small Sample Size',
      details: `Only ${summary.count} responses. Statistical estimates may have high uncertainty. Confidence intervals are wider and results should be interpreted with caution.`,
    });
  }

  // Missing data warning
  if (summary.missing > 0) {
    const missingRate = (summary.missing / (summary.count + summary.missing)) * 100;
    if (missingRate > 10) {
      warnings.push({
        type: 'warning',
        message: 'High Missing Data Rate',
        details: `${summary.missing} missing responses (${missingRate.toFixed(1)}%). This may introduce bias in the analysis.`,
      });
    }
  }

  // Confidence interval uncertainty
  if (summary.confidenceInterval) {
    const width = summary.confidenceInterval.upper - summary.confidenceInterval.lower;
    const mean = summary.mean || 0;
    const relativeWidth = mean !== 0 ? (width / Math.abs(mean)) * 100 : width;
    
    if (relativeWidth > 50) {
      warnings.push({
        type: 'uncertainty',
        message: 'Wide Confidence Interval',
        details: `The 95% confidence interval spans ${width.toFixed(2)} units, indicating high uncertainty in the estimate.`,
      });
    }
  }

  // Skewed distribution warning
  if ('isSkewed' in summary && summary.isSkewed) {
    warnings.push({
      type: 'limitation',
      message: 'Skewed Distribution',
      details: `The distribution is skewed (skewness: ${'skewness' in summary ? summary.skewness.toFixed(2) : 'N/A'}). Mean may not be representative; consider using median.`,
    });
  }

  // Custom warnings from computation
  if (summary.warnings && summary.warnings.length > 0) {
    summary.warnings.forEach(warning => {
      warnings.push({
        type: 'warning',
        message: warning,
        details: 'This may affect the reliability of statistical conclusions.',
      });
    });
  }

  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" role="region" aria-label="Statistical uncertainty and limitations">
      {warnings.map((warning, index) => (
        <WarningBadge
          key={index}
          type={warning.type}
          message={warning.message}
          details={warning.details}
        />
      ))}
    </div>
  );
};
