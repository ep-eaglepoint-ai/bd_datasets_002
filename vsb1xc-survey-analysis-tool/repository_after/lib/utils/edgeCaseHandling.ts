import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { validateSurveyResponse, validateSurveyResponses } from './validation';

/**
 * Handles extremely small sample sizes
 */
export function handleSmallSample(
  responses: SurveyResponse[],
  questionId: string
): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const questionResponses = responses.filter(r =>
    r.responses.some(res => res.questionId === questionId && res.value !== null)
  );

  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (questionResponses.length < 5) {
    warnings.push('Extremely small sample size (< 5 responses)');
    recommendations.push('Results are not statistically reliable');
    recommendations.push('Consider collecting more data before drawing conclusions');
    return { isValid: false, warnings, recommendations };
  }

  if (questionResponses.length < 30) {
    warnings.push('Small sample size (< 30 responses)');
    recommendations.push('Use non-parametric statistics when possible');
    recommendations.push('Report confidence intervals with caution');
    recommendations.push('Consider bootstrapping for estimates');
  }

  return { isValid: true, warnings, recommendations };
}

/**
 * Handles massive datasets with performance optimizations
 */
export function handleLargeDataset(
  responses: SurveyResponse[],
  threshold: number = 100000
): {
  needsOptimization: boolean;
  recommendations: string[];
  estimatedMemoryMB: number;
} {
  const estimatedMemoryMB = (JSON.stringify(responses).length / 1024 / 1024);
  const needsOptimization = responses.length >= threshold || estimatedMemoryMB > 100;

  const recommendations: string[] = [];
  if (needsOptimization) {
    recommendations.push('Use streaming processing for operations');
    recommendations.push('Process data in batches');
    recommendations.push('Consider using Web Workers for heavy computations');
    recommendations.push('Use virtualized rendering for large lists');
    recommendations.push('Enable incremental caching');
  }

  return { needsOptimization, recommendations, estimatedMemoryMB };
}

/**
 * Detects and handles contradictory responses
 */
export function detectContradictions(
  response: SurveyResponse,
  survey: Survey
): {
  contradictions: Array<{ question1: string; question2: string; reason: string }>;
  severity: 'low' | 'medium' | 'high';
} {
  const contradictions: Array<{ question1: string; question2: string; reason: string }> = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  // Check for logical contradictions (simplified)
  const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');
  
  if (ratingQuestions.length >= 2) {
    const ratings = ratingQuestions.map(q => {
      const res = response.responses.find(r => r.questionId === q.id);
      return typeof res?.value === 'number' ? res.value : null;
    }).filter((v): v is number => v !== null);

    if (ratings.length >= 2) {
      // Check for extreme variance that might indicate contradiction
      const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
      const stdDev = Math.sqrt(variance);
      const maxRating = Math.max(...ratings);
      const minRating = Math.min(...ratings);
      const range = maxRating - minRating;

      if (stdDev > range * 0.6 && range > 0) {
        contradictions.push({
          question1: ratingQuestions[0].id,
          question2: ratingQuestions[1].id,
          reason: 'Extreme variance in rating responses may indicate contradictory answers',
        });
        severity = 'medium';
      }
    }
  }

  return { contradictions, severity };
}

/**
 * Handles corrupted import data
 */
export function handleCorruptedImport(
  data: unknown[],
  expectedSchema: { fields: string[] }
): {
  valid: unknown[];
  corrupted: Array<{ index: number; errors: string[] }>;
  recoveryAttempts: number;
} {
  const valid: unknown[] = [];
  const corrupted: Array<{ index: number; errors: string[] }> = [];
  let recoveryAttempts = 0;

  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      corrupted.push({
        index,
        errors: ['Item is not an object'],
      });
      return;
    }

    const errors: string[] = [];
    const itemObj = item as Record<string, unknown>;

    // Check for required fields
    expectedSchema.fields.forEach(field => {
      if (!(field in itemObj)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Try to recover corrupted data
    if (errors.length > 0) {
      recoveryAttempts++;
      // Attempt basic recovery (set defaults for missing fields)
      const recovered = { ...itemObj };
      expectedSchema.fields.forEach(field => {
        if (!(field in recovered)) {
          recovered[field] = null;
        }
      });
      
      // Validate recovered data
      const validation = validateSurveyResponse(recovered as any);
      if (validation.success) {
        valid.push(recovered);
        return;
      }
    }

    if (errors.length > 0) {
      corrupted.push({ index, errors });
    } else {
      valid.push(item);
    }
  });

  return { valid, corrupted, recoveryAttempts };
}

/**
 * Handles multilingual text
 */
export function handleMultilingualText(text: string): {
  detectedLanguages: string[];
  isMultilingual: boolean;
  recommendations: string[];
} {
  // Simplified language detection (would use proper library in production)
  const detectedLanguages: string[] = [];
  const recommendations: string[] = [];

  // Basic heuristics
  const hasCyrillic = /[а-яА-ЯЁё]/.test(text);
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasCyrillic) detectedLanguages.push('Cyrillic (possibly Russian, etc.)');
  if (hasChinese) detectedLanguages.push('Chinese');
  if (hasArabic) detectedLanguages.push('Arabic');
  if (hasLatin) detectedLanguages.push('Latin-based');

  const isMultilingual = detectedLanguages.length > 1;

  if (isMultilingual) {
    recommendations.push('Text contains multiple language scripts');
    recommendations.push('Sentiment analysis may be less accurate');
    recommendations.push('Consider language-specific processing');
  }

  return { detectedLanguages, isMultilingual, recommendations };
}

/**
 * Handles biased sampling patterns
 */
export function detectBiasedSampling(
  responses: SurveyResponse[],
  survey: Survey
): {
  biases: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }>;
  recommendations: string[];
} {
  const biases: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
  const recommendations: string[] = [];

  // Check for temporal bias
  if (responses.length > 0) {
    const timestamps = responses.map(r => new Date(r.submittedAt).getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
    const days = timeSpan / (1000 * 60 * 60 * 24);

    if (days < 1) {
      biases.push({
        type: 'Temporal Clustering',
        description: 'All responses collected within 24 hours',
        severity: 'high',
      });
      recommendations.push('Responses may be temporally clustered, affecting generalizability');
    }
  }

  // Check for completion rate bias
  const completionRate = responses.filter(r => r.completed).length / responses.length;
  if (completionRate < 0.5) {
    biases.push({
      type: 'Low Completion Rate',
      description: `Only ${(completionRate * 100).toFixed(1)}% of responses are complete`,
      severity: 'high',
    });
    recommendations.push('Low completion rate may indicate sampling bias');
  }

  // Check for response pattern bias (straight-lining)
  let straightLineCount = 0;
  responses.forEach(response => {
    const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');
    if (ratingQuestions.length >= 3) {
      const ratings = ratingQuestions.map(q => {
        const res = response.responses.find(r => r.questionId === q.id);
        return typeof res?.value === 'number' ? res.value : null;
      }).filter((v): v is number => v !== null);

      if (ratings.length >= 3 && ratings.every(r => r === ratings[0])) {
        straightLineCount++;
      }
    }
  });

  const straightLineRate = straightLineCount / responses.length;
  if (straightLineRate > 0.2) {
    biases.push({
      type: 'Response Pattern Bias',
      description: `${(straightLineRate * 100).toFixed(1)}% of responses show straight-lining`,
      severity: 'medium',
    });
    recommendations.push('High rate of straight-lining may indicate inattentive respondents');
  }

  return { biases, recommendations };
}

/**
 * Handles annotation conflicts
 */
export function detectAnnotationConflicts(
  annotations: Array<{ responseId: string; codes: string[]; themes: string[] }>
): {
  conflicts: Array<{ responseId: string; type: string; description: string }>;
  recommendations: string[];
} {
  const conflicts: Array<{ responseId: string; type: string; description: string }> = [];
  const recommendations: string[] = [];

  // Group annotations by response
  const byResponse = new Map<string, Array<{ codes: string[]; themes: string[] }>>();
  annotations.forEach(ann => {
    if (!byResponse.has(ann.responseId)) {
      byResponse.set(ann.responseId, []);
    }
    byResponse.get(ann.responseId)!.push({ codes: ann.codes, themes: ann.themes });
  });

  // Check for conflicting codes/themes
  byResponse.forEach((anns, responseId) => {
    if (anns.length > 1) {
      const allCodes = new Set<string>();
      const allThemes = new Set<string>();

      anns.forEach(ann => {
        ann.codes.forEach(code => allCodes.add(code));
        ann.themes.forEach(theme => allThemes.add(theme));
      });

      // Check for contradictory codes (simplified - would need domain knowledge)
      const codesArray = Array.from(allCodes);
      if (codesArray.length > anns[0].codes.length * 1.5) {
        conflicts.push({
          responseId,
          type: 'Code Conflict',
          description: `Multiple annotations with conflicting codes: ${codesArray.join(', ')}`,
        });
        recommendations.push('Review annotations for consistency');
      }
    }
  });

  return { conflicts, recommendations };
}

/**
 * Handles schema evolution (backward compatibility)
 */
export function handleSchemaEvolution(
  data: unknown,
  currentSchema: { version: string; fields: string[] },
  dataSchema?: { version: string; fields: string[] }
): {
  compatible: boolean;
  migrated: boolean;
  warnings: string[];
  migratedData: unknown;
} {
  const warnings: string[] = [];
  let migrated = false;
  let migratedData = data;

  if (!dataSchema) {
    // Assume compatible if no schema info
    return { compatible: true, migrated: false, warnings, migratedData };
  }

  if (dataSchema.version !== currentSchema.version) {
    warnings.push(`Schema version mismatch: data is v${dataSchema.version}, current is v${currentSchema.version}`);
  }

  // Check for missing fields
  const dataObj = data as Record<string, unknown>;
  const missingFields = currentSchema.fields.filter(field => !(field in dataObj));
  
  if (missingFields.length > 0) {
    warnings.push(`Missing fields in data: ${missingFields.join(', ')}`);
    
    // Attempt migration by adding default values
    migratedData = { ...dataObj };
    missingFields.forEach(field => {
      (migratedData as Record<string, unknown>)[field] = null;
    });
    migrated = true;
  }

  // Check for extra fields
  const extraFields = Object.keys(dataObj).filter(field => !currentSchema.fields.includes(field));
  if (extraFields.length > 0) {
    warnings.push(`Extra fields in data (will be ignored): ${extraFields.join(', ')}`);
  }

  const compatible = missingFields.length === 0 || migrated;

  return { compatible, migrated, warnings, migratedData };
}
