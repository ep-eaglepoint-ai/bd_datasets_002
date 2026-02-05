import { SurveyResponse } from '@/lib/schemas/survey';
import { StatisticalSummary } from '@/lib/schemas/analytics';
import { validateStatisticalSummary } from './validation';

/**
 * Rounds a number to avoid floating-point precision issues
 */
function safeRound(value: number, decimals: number = 6): number {
  if (!isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Checks if a distribution is skewed
 */
function isSkewed(values: number[]): { skewed: boolean; skewness: number } {
  if (values.length < 3) {
    return { skewed: false, skewness: 0 };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  );

  if (stdDev === 0) {
    return { skewed: false, skewness: 0 };
  }

  const skewness =
    values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) /
    values.length;

  return {
    skewed: Math.abs(skewness) > 1,
    skewness: safeRound(skewness, 4),
  };
}

/**
 * Computes robust statistical summary with proper edge case handling
 */
export function computeRobustStatisticalSummary(
  responses: SurveyResponse[],
  questionId: string
): StatisticalSummary & {
  warnings: string[];
  sampleSize: 'small' | 'medium' | 'large';
  isSkewed: boolean;
  skewness: number;
} {
  const warnings: string[] = [];
  
  // Extract values, filtering out null/undefined/NaN
  const values = responses
    .flatMap(r => r.responses.filter(res => res.questionId === questionId))
    .map(res => res.value)
    .filter(v => v !== null && v !== undefined);

  // Convert to numeric, handling malformed entries
  const numericValues = values
    .map(v => {
      if (typeof v === 'number') {
        return isNaN(v) || !isFinite(v) ? null : v;
      }
      if (typeof v === 'string') {
        const num = parseFloat(v);
        return isNaN(num) || !isFinite(num) ? null : num;
      }
      return null;
    })
    .filter((v): v is number => v !== null);

  // Count should be based on valid numeric values, not all values
  const validNumericCount = numericValues.length;
  const count = validNumericCount; // Use valid count, not total values count
  const missing = responses.length - count;

  // Determine sample size category
  let sampleSize: 'small' | 'medium' | 'large';
  if (validNumericCount < 30) {
    sampleSize = 'small';
    warnings.push('Small sample size (< 30) - statistical measures may be unreliable');
  } else if (validNumericCount < 100) {
    sampleSize = 'medium';
  } else {
    sampleSize = 'large';
  }

  // Handle missing values warning
  if (missing > 0) {
    warnings.push(`${missing} missing values (${((missing / responses.length) * 100).toFixed(1)}%)`);
  }

  if (validNumericCount === 0) {
    // Categorical/text analysis
    const frequencyMap = new Map<unknown, number>();
    values.forEach(v => {
      frequencyMap.set(v, (frequencyMap.get(v) || 0) + 1);
    });

    const total = values.length;
    const frequencyDistribution = Array.from(frequencyMap.entries())
      .map(([value, freq]) => ({
        value,
        count: freq,
        proportion: safeRound(freq / total, 6),
      }))
      .sort((a, b) => b.count - a.count);

    const mode = frequencyDistribution[0]?.value || null;

    return {
      count,
      missing,
      mean: null,
      median: null,
      mode,
      stdDev: null,
      variance: null,
      min: null,
      max: null,
      frequencyDistribution,
      warnings,
      sampleSize,
      isSkewed: false,
      skewness: 0,
    };
  }

  // Numeric analysis with robust handling
  const sorted = [...numericValues].sort((a, b) => a - b);
  
  // Mean with precision handling
  const sum = numericValues.reduce((acc, v) => {
    // Use Kahan summation for better precision
    const y = v - acc.error;
    const t = acc.sum + y;
    acc.error = (t - acc.sum) - y;
    acc.sum = t;
    return acc;
  }, { sum: 0, error: 0 });
  const mean = safeRound(sum.sum / validNumericCount, 8);

  // Variance with Bessel's correction for sample
  const variance = validNumericCount > 1
    ? safeRound(
        numericValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
          (validNumericCount - 1),
        8
      )
    : 0;
  
  const stdDev = safeRound(Math.sqrt(variance), 8);

  // Median with proper handling
  let median: number;
  if (sorted.length === 0) {
    median = 0;
  } else if (sorted.length % 2 === 0) {
    const mid1 = sorted[sorted.length / 2 - 1];
    const mid2 = sorted[sorted.length / 2];
    median = safeRound((mid1 + mid2) / 2, 8);
  } else {
    median = sorted[Math.floor(sorted.length / 2)];
  }

  // Quartiles
  const q1 = sorted.length >= 4
    ? sorted[Math.floor(sorted.length * 0.25)]
    : sorted[0] || null;
  const q2 = median;
  const q3 = sorted.length >= 4
    ? sorted[Math.floor(sorted.length * 0.75)]
    : sorted[sorted.length - 1] || null;

  // Check for skewness
  const skewCheck = isSkewed(numericValues);
  if (skewCheck.skewed) {
    warnings.push(
      `Distribution is skewed (skewness: ${skewCheck.skewness.toFixed(2)}) - mean may not be representative`
    );
  }

  // Confidence interval with proper handling for small samples
  let confidenceInterval: { lower: number; upper: number; level: number } | undefined;
  if (validNumericCount >= 2) {
    const se = stdDev / Math.sqrt(validNumericCount);
    
    // Use t-distribution for small samples, z for large
    let criticalValue: number;
    if (validNumericCount < 30) {
      // Simplified t-value approximation (for small samples, use conservative estimate)
      // In production, would use proper t-distribution table
      criticalValue = 2.045; // Approximate t-value for n=30, 95% confidence
    } else {
      criticalValue = 1.96; // z-value for 95% confidence
    }

    const margin = criticalValue * se;
    confidenceInterval = {
      lower: safeRound(mean - margin, 8),
      upper: safeRound(mean + margin, 8),
      level: 0.95,
    };
  } else {
    warnings.push('Insufficient data for confidence interval calculation');
  }

  // Frequency distribution for numeric (binned) with proper binning
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min;
  
  // Use Sturges' rule for bin count, but cap at reasonable values
  const bins = Math.min(
    Math.max(Math.ceil(Math.log2(validNumericCount) + 1), 5),
    20
  );
  const binWidth = range / bins || 1;
  
  const frequencyMap = new Map<number, number>();
  numericValues.forEach(v => {
    const binIndex = Math.min(
      Math.floor((v - min) / binWidth),
      bins - 1
    );
    const binCenter = safeRound(min + binIndex * binWidth + binWidth / 2, 4);
    frequencyMap.set(binCenter, (frequencyMap.get(binCenter) || 0) + 1);
  });

  const frequencyDistribution = Array.from(frequencyMap.entries())
    .map(([value, freq]) => ({
      value,
      count: freq,
      proportion: safeRound(freq / validNumericCount, 6),
    }))
    .sort((a, b) => Number(a.value) - Number(b.value));

  const summary: StatisticalSummary & {
    warnings: string[];
    sampleSize: 'small' | 'medium' | 'large';
    isSkewed: boolean;
    skewness: number;
  } = {
    count,
    missing,
    mean,
    median,
    mode: null,
    stdDev,
    variance,
    min,
    max,
    quartiles: q1 !== null && q3 !== null ? { q1, q2, q3 } : undefined,
    confidenceInterval,
    frequencyDistribution,
    warnings,
    sampleSize,
    isSkewed: skewCheck.skewed,
    skewness: skewCheck.skewness,
  };

  // Validate the computed summary before returning
  const validation = validateStatisticalSummary(summary);
  if (!validation.success) {
    console.error('Statistical summary validation failed:', validation.errors);
    // Return summary anyway but log the error
    summary.warnings.push('Summary validation failed - results may be inconsistent');
  }

  return summary;
}
