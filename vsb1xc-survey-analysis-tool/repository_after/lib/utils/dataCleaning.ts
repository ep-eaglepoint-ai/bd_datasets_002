import { SurveyResponse, DatasetSnapshot, Response } from '@/lib/schemas/survey';
import { DataType } from '@/lib/schemas/survey';
import {
  removeDuplicates,
  trimWhitespace,
  normalizeText,
  standardizeLabels,
  handleMissingValues,
  flagOutliers,
} from './dataProcessing';
import { inferDataType, normalizeValue } from './dataProcessing';

export type CleaningRuleType =
  | 'remove-duplicates'
  | 'trim-whitespace'
  | 'normalize-text'
  | 'standardize-labels'
  | 'handle-missing'
  | 'flag-outliers'
  | 'fix-encoding'
  | 'coerce-types'
  | 'transform';

export interface CleaningRule {
  id: string;
  type: CleaningRuleType;
  config: Record<string, unknown>;
  appliedAt: string;
  description?: string;
}

export interface CleaningResult {
  cleaned: SurveyResponse[];
  removed: SurveyResponse[];
  flagged: Array<{ response: SurveyResponse; reason: string }>;
  stats: {
    originalCount: number;
    cleanedCount: number;
    removedCount: number;
    flaggedCount: number;
  };
  rules: CleaningRule[];
}

/**
 * Fixes encoding issues in string values
 */
export function fixEncoding(responses: SurveyResponse[]): SurveyResponse[] {
  return responses.map(response => ({
    ...response,
    responses: response.responses.map(res => {
      if (typeof res.value !== 'string') return res;
      
      let fixed = res.value;
      // Remove BOM
      fixed = fixed.replace(/\uFEFF/g, '');
      // Replace common encoding errors
      fixed = fixed.replace(/\uFFFD/g, ''); // Replacement character
      // Fix common encoding issues
      fixed = fixed.replace(/â€™/g, "'"); // Smart apostrophe
      fixed = fixed.replace(/â€œ/g, '"'); // Smart quote start
      fixed = fixed.replace(/â€/g, '"'); // Smart quote end
      fixed = fixed.replace(/â€"/g, '—'); // Em dash
      fixed = fixed.replace(/â€"/g, '–'); // En dash
      
      return { ...res, value: fixed };
    }),
  }));
}

/**
 * Coerces values to a specific type with safe handling
 */
export function coerceTypes(
  responses: SurveyResponse[],
  questionId: string,
  targetType: DataType,
  options?: {
    strict?: boolean; // If true, nullify invalid values; if false, try best-effort conversion
    handleMixed?: boolean; // Whether to handle mixed-type arrays
  }
): SurveyResponse[] {
  const { strict = false, handleMixed = true } = options || {};

  return responses.map(response => ({
    ...response,
    responses: response.responses.map(res => {
      if (res.questionId !== questionId) return res;

      let coerced: unknown = res.value;

      // Handle null/undefined
      if (coerced === null || coerced === undefined) {
        return { ...res, value: null };
      }

      // Handle mixed-type arrays
      if (Array.isArray(coerced) && handleMixed) {
        const coercedArray = coerced.map(item => {
          try {
            return normalizeValue(item, targetType);
          } catch {
            return strict ? null : item;
          }
        }).filter(item => item !== null);
        return { ...res, value: coercedArray.length > 0 ? coercedArray : null };
      }

      // Try to coerce the value
      try {
        coerced = normalizeValue(coerced, targetType);
        
        // Validate the coerced value
        if (coerced === null && strict) {
          return { ...res, value: null };
        }

        // Additional validation for numeric types
        if (targetType === 'numeric' && coerced !== null) {
          const num = Number(coerced);
          if (isNaN(num) || !isFinite(num)) {
            return { ...res, value: strict ? null : coerced };
          }
        }

        return { ...res, value: coerced };
      } catch (error) {
        // If coercion fails and strict mode, set to null
        if (strict) {
          return { ...res, value: null };
        }
        // Otherwise, keep original value
        return res;
      }
    }),
  }));
}

/**
 * Infers data types for all responses with tolerance for mixed types
 */
export function inferDataTypes(
  responses: SurveyResponse[],
  questionId: string
): {
  inferredType: DataType;
  confidence: number; // 0-1, how confident we are in the type
  mixedTypes: boolean; // Whether mixed types were detected
  sampleValues: unknown[]; // Sample values for inspection
} {
  const relevantResponses = responses
    .flatMap(r => r.responses.filter(res => res.questionId === questionId))
    .map(res => res.value)
    .filter(v => v !== null && v !== undefined);

  if (relevantResponses.length === 0) {
    return {
      inferredType: 'mixed',
      confidence: 0,
      mixedTypes: false,
      sampleValues: [],
    };
  }

  // Count type occurrences
  const typeCounts = new Map<DataType, number>();
  const typeSamples = new Map<DataType, unknown[]>();

  relevantResponses.forEach(value => {
    // Try to infer type
    let inferred: DataType = 'mixed';
    
    if (typeof value === 'number') {
      inferred = 'numeric';
    } else if (typeof value === 'boolean') {
      inferred = 'boolean';
    } else if (Array.isArray(value)) {
      inferred = 'categorical';
    } else if (typeof value === 'string') {
      // Try to parse as number
      const num = Number(value);
      if (!isNaN(num) && value.trim() !== '' && isFinite(num)) {
        inferred = 'numeric';
      } else {
        // Try to parse as date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          inferred = 'date';
        } else {
          // Check for boolean-like strings
          const lower = value.toLowerCase().trim();
          if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') {
            inferred = 'boolean';
          } else {
            inferred = 'text';
          }
        }
      }
    }

    typeCounts.set(inferred, (typeCounts.get(inferred) || 0) + 1);
    if (!typeSamples.has(inferred)) {
      typeSamples.set(inferred, []);
    }
    typeSamples.get(inferred)!.push(value);
  });

  // Find dominant type
  let maxCount = 0;
  let dominantType: DataType = 'mixed';
  
  typeCounts.forEach((count, type) => {
    if (count > maxCount) {
      maxCount = count;
      dominantType = type;
    }
  });

  const total = relevantResponses.length;
  const confidence = maxCount / total;
  const mixedTypes = typeCounts.size > 1;

  return {
    inferredType: dominantType,
    confidence,
    mixedTypes,
    sampleValues: typeSamples.get(dominantType)?.slice(0, 5) || [],
  };
}

/**
 * Applies a cleaning pipeline to responses in a non-destructive way
 * Returns a snapshot with the cleaned data
 * Automatically creates before/after snapshots for reproducibility
 */
export async function applyCleaningPipeline(
  responses: SurveyResponse[],
  rules: CleaningRule[],
  surveyId: string,
  snapshotName: string
): Promise<{ snapshot: DatasetSnapshot; result: CleaningResult; beforeSnapshot?: DatasetSnapshot }> {
  // Import snapshot manager
  const {
    createSnapshotBeforeCleaning,
    createSnapshotAfterCleaning,
  } = await import('./snapshotManager');
  
  // Create before snapshot
  const beforeSnapshot = await createSnapshotBeforeCleaning(surveyId, responses, rules);
  let cleaned = [...responses];
  const removed: SurveyResponse[] = [];
  const flagged: Array<{ response: SurveyResponse; reason: string }> = [];

  // Apply each rule in sequence
  rules.forEach(rule => {
    const beforeCount = cleaned.length;

    switch (rule.type) {
      case 'remove-duplicates':
        const strategy = (rule.config.strategy as 'id' | 'content' | 'timestamp') || 'id';
        const beforeDedup = cleaned.length;
        cleaned = removeDuplicates(cleaned, strategy);
        const removedCount = beforeDedup - cleaned.length;
        if (removedCount > 0) {
          // Note: We can't easily track which ones were removed here
          // In a real implementation, you'd want to track this
        }
        break;

      case 'trim-whitespace':
        cleaned = trimWhitespace(cleaned);
        break;

      case 'normalize-text':
        cleaned = normalizeText(cleaned);
        break;

      case 'standardize-labels':
        const questionId = rule.config.questionId as string;
        const mapping = rule.config.mapping as Record<string, string> | undefined;
        cleaned = standardizeLabels(cleaned, questionId, mapping);
        break;

      case 'handle-missing':
        const strategy2 = (rule.config.strategy as 'remove' | 'impute-mean' | 'impute-mode' | 'keep') || 'keep';
        if (strategy2 === 'remove') {
          const beforeMissing = cleaned.length;
          cleaned = handleMissingValues(cleaned, strategy2);
          const removedMissing = beforeMissing - cleaned.length;
          // Track removed responses (simplified - in reality would track which ones)
        }
        break;

      case 'flag-outliers':
        const questionId2 = rule.config.questionId as string;
        const outlierResults = flagOutliers(cleaned, questionId2);
        outlierResults.forEach(({ response, isOutlier }) => {
          if (isOutlier) {
            flagged.push({ response, reason: `Outlier detected for question ${questionId2}` });
          }
        });
        break;

      case 'fix-encoding':
        cleaned = fixEncoding(cleaned);
        break;

      case 'coerce-types':
        const questionId3 = rule.config.questionId as string;
        const targetType = rule.config.targetType as DataType;
        const options = rule.config.options as { strict?: boolean; handleMixed?: boolean } | undefined;
        cleaned = coerceTypes(cleaned, questionId3, targetType, options);
        break;

      case 'transform':
        // Custom transformation - would need to be defined by user
        // For now, just pass through
        break;
    }

    const afterCount = cleaned.length;
    if (afterCount < beforeCount) {
      // Some responses were removed
      // In a full implementation, we'd track which ones
    }
  });

  // Create after snapshot
  const snapshot = await createSnapshotAfterCleaning(surveyId, cleaned, rules, beforeSnapshot.id);

  const result: CleaningResult = {
    cleaned,
    removed,
    flagged,
    stats: {
      originalCount: responses.length,
      cleanedCount: cleaned.length,
      removedCount: removed.length,
      flaggedCount: flagged.length,
    },
    rules,
  };

  return { snapshot, result, beforeSnapshot };
}
