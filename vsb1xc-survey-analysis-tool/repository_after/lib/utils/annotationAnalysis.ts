import { Annotation } from '@/lib/schemas/analytics';
import { SurveyResponse } from '@/lib/schemas/survey';

export interface AnnotationHistory {
  annotationId: string;
  changes: Array<{
    timestamp: string;
    action: 'created' | 'updated' | 'deleted';
    changes: {
      codes?: { added?: string[]; removed?: string[] };
      themes?: { added?: string[]; removed?: string[] };
      notes?: { old?: string; new?: string };
    };
    changedBy?: string;
  }>;
}

export interface ThemeFrequency {
  theme: string;
  frequency: number;
  proportion: number;
  responseIds: string[];
}

export interface ThemeCoOccurrence {
  theme1: string;
  theme2: string;
  coOccurrenceCount: number;
  coOccurrenceRate: number; // Proportion of times theme1 appears with theme2
  responses: string[];
}

export interface CodeFrequency {
  code: string;
  frequency: number;
  proportion: number;
  responseIds: string[];
}

/**
 * Computes frequency of themes across annotations
 */
export function computeThemeFrequency(annotations: Annotation[]): ThemeFrequency[] {
  const themeMap = new Map<string, { count: number; responseIds: Set<string> }>();

  annotations.forEach(annotation => {
    annotation.themes.forEach(theme => {
      const existing = themeMap.get(theme);
      if (existing) {
        existing.count++;
        existing.responseIds.add(annotation.responseId);
      } else {
        themeMap.set(theme, {
          count: 1,
          responseIds: new Set([annotation.responseId]),
        });
      }
    });
  });

  const total = annotations.length;
  return Array.from(themeMap.entries())
    .map(([theme, data]) => ({
      theme,
      frequency: data.count,
      proportion: total > 0 ? data.count / total : 0,
      responseIds: Array.from(data.responseIds),
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Computes frequency of codes across annotations
 */
export function computeCodeFrequency(annotations: Annotation[]): CodeFrequency[] {
  const codeMap = new Map<string, { count: number; responseIds: Set<string> }>();

  annotations.forEach(annotation => {
    annotation.codes.forEach(code => {
      const existing = codeMap.get(code);
      if (existing) {
        existing.count++;
        existing.responseIds.add(annotation.responseId);
      } else {
        codeMap.set(code, {
          count: 1,
          responseIds: new Set([annotation.responseId]),
        });
      }
    });
  });

  const total = annotations.length;
  return Array.from(codeMap.entries())
    .map(([code, data]) => ({
      code,
      frequency: data.count,
      proportion: total > 0 ? data.count / total : 0,
      responseIds: Array.from(data.responseIds),
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Computes co-occurrence of themes
 */
export function computeThemeCoOccurrence(annotations: Annotation[]): ThemeCoOccurrence[] {
  const coOccurrenceMap = new Map<string, Map<string, { count: number; responses: Set<string> }>>();
  const themeFrequency = new Map<string, number>();

  // Build co-occurrence matrix
  annotations.forEach(annotation => {
    const themes = annotation.themes;
    
    themes.forEach(theme => {
      themeFrequency.set(theme, (themeFrequency.get(theme) || 0) + 1);
      
      if (!coOccurrenceMap.has(theme)) {
        coOccurrenceMap.set(theme, new Map());
      }
      
      themes.forEach(otherTheme => {
        if (theme !== otherTheme) {
          const themeMap = coOccurrenceMap.get(theme)!;
          const existing = themeMap.get(otherTheme);
          if (existing) {
            existing.count++;
            existing.responses.add(annotation.responseId);
          } else {
            themeMap.set(otherTheme, {
              count: 1,
              responses: new Set([annotation.responseId]),
            });
          }
        }
      });
    });
  });

  // Convert to array format
  const coOccurrences: ThemeCoOccurrence[] = [];
  coOccurrenceMap.forEach((otherThemes, theme1) => {
    otherThemes.forEach((data, theme2) => {
      const theme1Freq = themeFrequency.get(theme1) || 1;
      coOccurrences.push({
        theme1,
        theme2,
        coOccurrenceCount: data.count,
        coOccurrenceRate: data.count / theme1Freq,
        responses: Array.from(data.responses),
      });
    });
  });

  return coOccurrences.sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);
}

/**
 * Tracks annotation history for auditability
 */
export function trackAnnotationChange(
  oldAnnotation: Annotation | null,
  newAnnotation: Annotation,
  action: 'created' | 'updated' | 'deleted'
): AnnotationHistory['changes'][0] {
  const changes: AnnotationHistory['changes'][0]['changes'] = {};

  if (oldAnnotation) {
    // Track code changes
    const addedCodes = newAnnotation.codes.filter(c => !oldAnnotation.codes.includes(c));
    const removedCodes = oldAnnotation.codes.filter(c => !newAnnotation.codes.includes(c));
    if (addedCodes.length > 0 || removedCodes.length > 0) {
      changes.codes = {};
      if (addedCodes.length > 0) changes.codes.added = addedCodes;
      if (removedCodes.length > 0) changes.codes.removed = removedCodes;
    }

    // Track theme changes
    const addedThemes = newAnnotation.themes.filter(t => !oldAnnotation.themes.includes(t));
    const removedThemes = oldAnnotation.themes.filter(t => !newAnnotation.themes.includes(t));
    if (addedThemes.length > 0 || removedThemes.length > 0) {
      changes.themes = {};
      if (addedThemes.length > 0) changes.themes.added = addedThemes;
      if (removedThemes.length > 0) changes.themes.removed = removedThemes;
    }

    // Track notes changes
    if (oldAnnotation.notes !== newAnnotation.notes) {
      changes.notes = {
        old: oldAnnotation.notes,
        new: newAnnotation.notes,
      };
    }
  } else if (action === 'created') {
    // New annotation
    if (newAnnotation.codes.length > 0) {
      changes.codes = { added: newAnnotation.codes };
    }
    if (newAnnotation.themes.length > 0) {
      changes.themes = { added: newAnnotation.themes };
    }
    if (newAnnotation.notes) {
      changes.notes = { new: newAnnotation.notes };
    }
  }

  return {
    timestamp: new Date().toISOString(),
    action,
    changes,
    changedBy: newAnnotation.createdBy || 'system', // Default to 'system' if not provided
  };
}

/**
 * Gets annotation history for a response
 */
export function getAnnotationHistory(
  annotations: Annotation[],
  responseId: string
): AnnotationHistory | null {
  const annotation = annotations.find(a => a.responseId === responseId);
  if (!annotation) return null;

  // In a full implementation, this would fetch from a history store
  // For now, we reconstruct from createdAt/updatedAt
  const history: AnnotationHistory = {
    annotationId: annotation.id,
    changes: [],
  };

  if (annotation.createdAt) {
    history.changes.push({
      timestamp: annotation.createdAt,
      action: 'created',
      changes: {
        codes: annotation.codes.length > 0 ? { added: annotation.codes } : undefined,
        themes: annotation.themes.length > 0 ? { added: annotation.themes } : undefined,
        notes: annotation.notes ? { new: annotation.notes } : undefined,
      },
      changedBy: annotation.createdBy,
    });
  }

  if (annotation.updatedAt && annotation.updatedAt !== annotation.createdAt) {
    history.changes.push({
      timestamp: annotation.updatedAt,
      action: 'updated',
      changes: {}, // Would need old version to compute actual changes
      changedBy: annotation.createdBy,
    });
  }

  return history;
}

/**
 * Analyzes annotation patterns across responses
 */
export function analyzeAnnotationPatterns(
  annotations: Annotation[],
  responses: SurveyResponse[]
): {
  themeFrequency: ThemeFrequency[];
  codeFrequency: CodeFrequency[];
  coOccurrences: ThemeCoOccurrence[];
  coverage: {
    annotated: number;
    total: number;
    coverageRate: number;
  };
} {
  const themeFrequency = computeThemeFrequency(annotations);
  const codeFrequency = computeCodeFrequency(annotations);
  const coOccurrences = computeThemeCoOccurrence(annotations);

  const annotatedResponseIds = new Set(annotations.map(a => a.responseId));
  const coverage = {
    annotated: annotatedResponseIds.size,
    total: responses.length,
    coverageRate: responses.length > 0 ? annotatedResponseIds.size / responses.length : 0,
  };

  return {
    themeFrequency,
    codeFrequency,
    coOccurrences,
    coverage,
  };
}
