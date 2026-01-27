import { SurveyResponse, Response, Question, DataType } from '@/lib/schemas/survey';
import { StatisticalSummary } from '@/lib/schemas/analytics';

/**
 * Infers the data type of a response value with tolerance for malformed entries
 */
export function inferDataType(value: unknown, question?: Question): DataType {
  if (value === null || value === undefined) {
    return 'mixed';
  }

  if (question) {
    switch (question.type) {
      case 'numeric':
        return 'numeric';
      case 'rating-scale':
        return 'ordinal';
      case 'multiple-choice':
        return 'categorical';
      case 'text':
        return 'text';
      case 'ranking':
        return 'ordinal';
      case 'matrix':
        return 'categorical';
    }
  }

  // Try to infer from value with tolerance for malformed entries
  if (typeof value === 'number') {
    // Check for invalid numbers
    if (isNaN(value) || !isFinite(value)) {
      return 'mixed'; // Malformed numeric
    }
    return 'numeric';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return 'mixed'; // Empty string
    }

    // Try to parse as number (tolerant of formatting issues)
    const num = Number(trimmed);
    if (!isNaN(num) && isFinite(num) && trimmed !== '') {
      // Additional check: if it looks like a number but has extra characters, might be mixed
      const numStr = String(num);
      if (trimmed.replace(/[,\s$%]/g, '') === numStr || trimmed === numStr) {
        return 'numeric';
      }
    }

    // Try to parse as date (tolerant of various formats)
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      // Check if it's a reasonable date (not epoch 0 or far future)
      const year = date.getFullYear();
      if (year >= 1900 && year <= 2100) {
        return 'date';
      }
    }

    // Check for boolean-like strings
    const lower = trimmed.toLowerCase();
    if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no' ||
        lower === '1' || lower === '0' || lower === 'y' || lower === 'n') {
      return 'boolean';
    }

    return 'text';
  }
  if (Array.isArray(value)) {
    // Check if array contains mixed types
    const types = new Set(value.map(v => inferDataType(v, question)));
    if (types.size > 1) {
      return 'mixed'; // Mixed types in array
    }
    return 'categorical';
  }
  if (typeof value === 'object') {
    // Could be a matrix response or other structured data
    return 'categorical';
  }

  return 'mixed';
}

/**
 * Normalizes a value to a consistent type with safe re-coercion
 * Tolerates malformed entries and provides best-effort conversion
 */
export function normalizeValue(
  value: unknown,
  targetType: DataType,
  options?: {
    strict?: boolean; // If true, return null for invalid values; if false, try best-effort
    handleMixed?: boolean; // Whether to handle mixed-type arrays
  }
): unknown {
  const { strict = false, handleMixed = true } = options || {};

  if (value === null || value === undefined) {
    return null;
  }

  try {
    switch (targetType) {
      case 'numeric': {
        // Handle various numeric formats
        if (typeof value === 'number') {
          return isNaN(value) || !isFinite(value) ? (strict ? null : value) : value;
        }
        if (typeof value === 'string') {
          // Remove common formatting characters
          const cleaned = value.replace(/[,\s$%]/g, '').trim();
          const num = parseFloat(cleaned);
          if (!isNaN(num) && isFinite(num)) {
            return num;
          }
          // Try to extract number from string
          const match = cleaned.match(/[\d.]+/);
          if (match) {
            const extracted = parseFloat(match[0]);
            if (!isNaN(extracted) && isFinite(extracted)) {
              return extracted;
            }
          }
        }
        // Try boolean to number
        if (typeof value === 'boolean') {
          return value ? 1 : 0;
        }
        return strict ? null : value;
      }

      case 'text': {
        if (typeof value === 'string') {
          return value.trim();
        }
        // Convert other types to string
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (Array.isArray(value)) {
          return value.map(v => String(v)).join(', ');
        }
        return String(value).trim();
      }

      case 'boolean': {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') {
          return value !== 0 && !isNaN(value);
        }
        if (typeof value === 'string') {
          const str = value.toLowerCase().trim();
          if (str === 'true' || str === '1' || str === 'yes' || str === 'y' || str === 'on') {
            return true;
          }
          if (str === 'false' || str === '0' || str === 'no' || str === 'n' || str === 'off') {
            return false;
          }
        }
        return strict ? null : Boolean(value);
      }

      case 'categorical': {
        if (Array.isArray(value) && handleMixed) {
          // Handle mixed-type arrays by converting all to strings
          return value.map(v => String(v).trim()).filter(v => v !== '');
        }
        return String(value).trim();
      }

      case 'ordinal': {
        if (typeof value === 'number') {
          return Math.round(value); // Ordinal should be integer
        }
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          if (!isNaN(num) && isFinite(num)) {
            return num;
          }
        }
        return strict ? null : (typeof value === 'number' ? Math.round(value) : null);
      }

      case 'date': {
        if (value instanceof Date) {
          return isNaN(value.getTime()) ? (strict ? null : value) : value.toISOString();
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
        if (typeof value === 'number') {
          // Could be a timestamp
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
        return strict ? null : value;
      }

      default:
        return value;
    }
  } catch (error) {
    // If any error occurs during normalization
    return strict ? null : value;
  }
}

/**
 * Removes duplicate responses based on response ID or content
 */
export function removeDuplicates(
  responses: SurveyResponse[],
  strategy: 'id' | 'content' | 'timestamp' = 'id'
): SurveyResponse[] {
  if (strategy === 'id') {
    const seen = new Set<string>();
    return responses.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }

  if (strategy === 'content') {
    const seen = new Set<string>();
    return responses.filter(r => {
      const key = JSON.stringify(r.responses.map(res => ({ questionId: res.questionId, value: res.value })));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // timestamp strategy
  const grouped = new Map<string, SurveyResponse[]>();
  responses.forEach(r => {
    const key = r.submittedAt.split('T')[0]; // Group by date
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  return Array.from(grouped.values()).map(group => 
    group.reduce((latest, current) => 
      new Date(current.submittedAt) > new Date(latest.submittedAt) ? current : latest
    )
  );
}

/**
 * Trims whitespace from string values
 */
export function trimWhitespace(responses: SurveyResponse[]): SurveyResponse[] {
  return responses.map(response => ({
    ...response,
    responses: response.responses.map(res => ({
      ...res,
      value: typeof res.value === 'string' ? res.value.trim() : res.value,
    })),
  }));
}

/**
 * Normalizes text (lowercase, remove extra spaces)
 */
export function normalizeText(responses: SurveyResponse[]): SurveyResponse[] {
  return responses.map(response => ({
    ...response,
    responses: response.responses.map(res => ({
      ...res,
      value: typeof res.value === 'string' 
        ? res.value.toLowerCase().replace(/\s+/g, ' ').trim()
        : res.value,
    })),
  }));
}

/**
 * Standardizes categorical labels (removes case sensitivity, normalizes)
 */
export function standardizeLabels(
  responses: SurveyResponse[],
  questionId: string,
  mapping?: Record<string, string>
): SurveyResponse[] {
  return responses.map(response => ({
    ...response,
    responses: response.responses.map(res => {
      if (res.questionId !== questionId || typeof res.value !== 'string') {
        return res;
      }
      const normalized = res.value.toLowerCase().trim();
      const standardized = mapping?.[normalized] || normalized;
      return { ...res, value: standardized };
    }),
  }));
}

/**
 * Handles missing values with a strategy
 */
export function handleMissingValues(
  responses: SurveyResponse[],
  strategy: 'remove' | 'impute-mean' | 'impute-mode' | 'keep' = 'keep',
  questionId?: string // Optional: only handle missing for specific question
): SurveyResponse[] {
  if (strategy === 'keep') {
    return responses;
  }

  if (strategy === 'remove') {
    if (questionId) {
      // Remove responses where this specific question is missing
      return responses.filter(response => {
        const res = response.responses.find(r => r.questionId === questionId);
        return res && res.value !== null && res.value !== undefined;
      });
    } else {
      // Remove responses with any missing values
      return responses.filter(response => 
        response.responses.every(res => res.value !== null && res.value !== undefined)
      );
    }
  }

  // For imputation, compute statistics per question
  if (strategy === 'impute-mean' || strategy === 'impute-mode') {
    const imputed = responses.map(response => {
      const newResponses = response.responses.map(res => {
        // Only impute for specified question or all questions
        if (questionId && res.questionId !== questionId) {
          return res;
        }

        if (res.value !== null && res.value !== undefined) {
          return res;
        }

        // Compute statistic for this question
        const questionResponses = responses
          .flatMap(r => r.responses.filter(rr => rr.questionId === res.questionId))
          .map(rr => rr.value)
          .filter(v => v !== null && v !== undefined);

        if (questionResponses.length === 0) {
          return res; // No data to impute from
        }

        let imputedValue: unknown = null;

        if (strategy === 'impute-mean') {
          // Try to compute mean
          const numericValues = questionResponses
            .map(v => typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : null)
            .filter((v): v is number => v !== null && !isNaN(v));

          if (numericValues.length > 0) {
            imputedValue = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
          }
        } else if (strategy === 'impute-mode') {
          // Compute mode
          const frequencyMap = new Map<unknown, number>();
          questionResponses.forEach(v => {
            frequencyMap.set(v, (frequencyMap.get(v) || 0) + 1);
          });
          let maxCount = 0;
          let mode: unknown = null;
          frequencyMap.forEach((count, value) => {
            if (count > maxCount) {
              maxCount = count;
              mode = value;
            }
          });
          imputedValue = mode;
        }

        return { ...res, value: imputedValue };
      });

      return { ...response, responses: newResponses };
    });

    return imputed;
  }

  return responses;
}

/**
 * Flags outliers using IQR method
 */
export function flagOutliers(
  responses: SurveyResponse[],
  questionId: string
): { response: SurveyResponse; isOutlier: boolean }[] {
  const values = responses
    .flatMap(r => r.responses.filter(res => res.questionId === questionId))
    .map(res => typeof res.value === 'number' ? res.value : null)
    .filter((v): v is number => v !== null);

  if (values.length < 4) {
    return responses.map(r => ({ response: r, isOutlier: false }));
  }

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return responses.map(response => {
    const relevantResponse = response.responses.find(r => r.questionId === questionId);
    if (!relevantResponse || typeof relevantResponse.value !== 'number') {
      return { response, isOutlier: false };
    }
    const isOutlier = relevantResponse.value < lowerBound || relevantResponse.value > upperBound;
    return { response, isOutlier };
  });
}

/**
 * Computes statistical summary for a question
 */
export function computeStatisticalSummary(
  responses: SurveyResponse[],
  questionId: string
): StatisticalSummary {
  const values = responses
    .flatMap(r => r.responses.filter(res => res.questionId === questionId))
    .map(res => res.value)
    .filter(v => v !== null && v !== undefined);

  const numericValues = values
    .map(v => typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : null)
    .filter((v): v is number => v !== null && !isNaN(v));

  const count = values.length;
  const missing = responses.length - count;

  if (numericValues.length === 0) {
    // Categorical/text analysis
    const frequencyMap = new Map<unknown, number>();
    values.forEach(v => {
      frequencyMap.set(v, (frequencyMap.get(v) || 0) + 1);
    });

    const frequencyDistribution = Array.from(frequencyMap.entries())
      .map(([value, count]) => ({
        value,
        count,
        proportion: count / count,
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
    };
  }

  // Numeric analysis
  const sorted = [...numericValues].sort((a, b) => a - b);
  const mean = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length;
  const variance = numericValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numericValues.length;
  const stdDev = Math.sqrt(variance);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q2 = median;
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  // Confidence interval (95%)
  const se = stdDev / Math.sqrt(numericValues.length);
  const z = 1.96; // 95% confidence
  const confidenceInterval = {
    lower: mean - z * se,
    upper: mean + z * se,
    level: 0.95,
  };

  // Frequency distribution for numeric (binned)
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const bins = 10;
  const binWidth = (max - min) / bins;
  const frequencyMap = new Map<number, number>();
  numericValues.forEach(v => {
    const bin = Math.floor((v - min) / binWidth);
    const binCenter = min + bin * binWidth + binWidth / 2;
    frequencyMap.set(binCenter, (frequencyMap.get(binCenter) || 0) + 1);
  });

  const frequencyDistribution = Array.from(frequencyMap.entries())
    .map(([value, count]) => ({
      value,
      count,
      proportion: count / numericValues.length,
    }))
    .sort((a, b) => Number(a.value) - Number(b.value));

  return {
    count,
    missing,
    mean,
    median,
    mode: null,
    stdDev,
    variance,
    min,
    max,
    quartiles: { q1, q2, q3 },
    confidenceInterval,
    frequencyDistribution,
  };
}
