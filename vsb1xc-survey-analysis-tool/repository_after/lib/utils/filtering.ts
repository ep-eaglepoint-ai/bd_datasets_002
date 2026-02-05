import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { BiasFlags } from '@/lib/schemas/analytics';
import { computeBiasFlags } from './biasDetection';

export type FilterOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'greater-than'
  | 'less-than'
  | 'greater-than-or-equal'
  | 'less-than-or-equal'
  | 'in'
  | 'not-in'
  | 'between'
  | 'is-null'
  | 'is-not-null';

export interface FilterCondition {
  field: 'question' | 'demographic' | 'timestamp' | 'completion' | 'bias-flag' | 'annotation';
  questionId?: string; // For question-based filters
  operator: FilterOperator;
  value: unknown;
}

export interface FilterGroup {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface ResponseFilter {
  groups: FilterGroup[];
  groupLogic: 'AND' | 'OR';
}

/**
 * Fast, deterministic filter implementation using indexed lookups where possible
 */
export function filterResponses(
  responses: SurveyResponse[],
  survey: Survey,
  filter: ResponseFilter,
  options?: {
    biasFlags?: Map<string, BiasFlags>;
    annotations?: Array<{ responseId: string; codes: string[]; themes: string[] }>;
  }
): SurveyResponse[] {
  if (filter.groups.length === 0) {
    return responses;
  }

  // Pre-compute bias flags if not provided
  const biasFlagsMap = options?.biasFlags || new Map<string, BiasFlags>();
  if (options?.biasFlags === undefined) {
    responses.forEach(response => {
      if (!biasFlagsMap.has(response.id)) {
        biasFlagsMap.set(response.id, computeBiasFlags(response, survey, responses));
      }
    });
  }

  // Pre-compute annotation map
  const annotationMap = new Map<string, { codes: Set<string>; themes: Set<string> }>();
  options?.annotations?.forEach(ann => {
    annotationMap.set(ann.responseId, {
      codes: new Set(ann.codes),
      themes: new Set(ann.themes),
    });
  });

  // Filter responses
  return responses.filter(response => {
    // Evaluate each group
    const groupResults = filter.groups.map(group => {
      // Evaluate conditions in group
      const conditionResults = group.conditions.map(condition => {
        return evaluateCondition(response, survey, condition, biasFlagsMap, annotationMap);
      });

      // Apply group logic
      if (group.logic === 'AND') {
        return conditionResults.every(r => r);
      } else {
        return conditionResults.some(r => r);
      }
    });

    // Apply group logic
    if (filter.groupLogic === 'AND') {
      return groupResults.every(r => r);
    } else {
      return groupResults.some(r => r);
    }
  });
}

/**
 * Evaluates a single filter condition
 */
function evaluateCondition(
  response: SurveyResponse,
  survey: Survey,
  condition: FilterCondition,
  biasFlags: Map<string, BiasFlags>,
  annotations: Map<string, { codes: Set<string>; themes: Set<string> }>
): boolean {
  switch (condition.field) {
    case 'question': {
      if (!condition.questionId) return true;
      const res = response.responses.find(r => r.questionId === condition.questionId);
      const responseValue = res?.value;

      return evaluateOperator(responseValue, condition.operator, condition.value);
    }

    case 'demographic': {
      // Demographic variables are typically stored as question responses
      // This would need to be configured based on which questions are demographics
      if (!condition.questionId) return true;
      const res = response.responses.find(r => r.questionId === condition.questionId);
      const responseValue = res?.value;

      return evaluateOperator(responseValue, condition.operator, condition.value);
    }

    case 'timestamp': {
      const timestamp = new Date(response.submittedAt).getTime();
      const filterValue = condition.value;

      switch (condition.operator) {
        case 'greater-than':
          return timestamp > (typeof filterValue === 'number' ? filterValue : new Date(filterValue as string).getTime());
        case 'less-than':
          return timestamp < (typeof filterValue === 'number' ? filterValue : new Date(filterValue as string).getTime());
        case 'between':
          if (Array.isArray(filterValue) && filterValue.length === 2) {
            const start = typeof filterValue[0] === 'number' ? filterValue[0] : new Date(filterValue[0] as string).getTime();
            const end = typeof filterValue[1] === 'number' ? filterValue[1] : new Date(filterValue[1] as string).getTime();
            return timestamp >= start && timestamp <= end;
          }
          return false;
        default:
          return true;
      }
    }

    case 'completion': {
      const isCompleted = response.completed;
      const filterValue = condition.value;

      switch (condition.operator) {
        case 'equals':
          return isCompleted === filterValue;
        case 'not-equals':
          return isCompleted !== filterValue;
        default:
          return true;
      }
    }

    case 'bias-flag': {
      const flags = biasFlags.get(response.id);
      if (!flags) return false;

      const flagValue = condition.value as string;
      return flags.flags.includes(flagValue);
    }

    case 'annotation': {
      const annotation = annotations.get(response.id);
      if (!annotation) {
        return condition.operator === 'is-null';
      }

      const tagType = (condition.value as { type: 'code' | 'theme'; value: string })?.type;
      const tagValue = (condition.value as { type: 'code' | 'theme'; value: string })?.value;

      if (tagType === 'code') {
        return annotation.codes.has(tagValue);
      } else if (tagType === 'theme') {
        return annotation.themes.has(tagValue);
      }

      return false;
    }

    default:
      return true;
  }
}

/**
 * Evaluates an operator on a value
 */
function evaluateOperator(
  value: unknown,
  operator: FilterOperator,
  filterValue: unknown
): boolean {
  if (operator === 'is-null') {
    return value === null || value === undefined;
  }
  if (operator === 'is-not-null') {
    return value !== null && value !== undefined;
  }

  if (value === null || value === undefined) {
    return false;
  }

  switch (operator) {
    case 'equals':
      return String(value) === String(filterValue);

    case 'not-equals':
      return String(value) !== String(filterValue);

    case 'contains':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());

    case 'greater-than':
      return typeof value === 'number' && typeof filterValue === 'number'
        ? value > filterValue
        : String(value) > String(filterValue);

    case 'less-than':
      return typeof value === 'number' && typeof filterValue === 'number'
        ? value < filterValue
        : String(value) < String(filterValue);

    case 'greater-than-or-equal':
      return typeof value === 'number' && typeof filterValue === 'number'
        ? value >= filterValue
        : String(value) >= String(filterValue);

    case 'less-than-or-equal':
      return typeof value === 'number' && typeof filterValue === 'number'
        ? value <= filterValue
        : String(value) <= String(filterValue);

    case 'in':
      return Array.isArray(filterValue) && filterValue.some(v => String(value) === String(v));

    case 'not-in':
      return Array.isArray(filterValue) && !filterValue.some(v => String(value) === String(v));

    case 'between':
      if (Array.isArray(filterValue) && filterValue.length === 2) {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value));
        const start = typeof filterValue[0] === 'number' ? filterValue[0] : parseFloat(String(filterValue[0]));
        const end = typeof filterValue[1] === 'number' ? filterValue[1] : parseFloat(String(filterValue[1]));
        return !isNaN(numValue) && numValue >= start && numValue <= end;
      }
      return false;

    default:
      return true;
  }
}

/**
 * Creates an optimized filter index for faster filtering on large datasets
 */
export function createFilterIndex(
  responses: SurveyResponse[],
  survey: Survey
): Map<string, Map<unknown, Set<string>>> {
  const index = new Map<string, Map<unknown, Set<string>>>();

  // Index by question values
  survey.questions.forEach(question => {
    const questionIndex = new Map<unknown, Set<string>>();
    
    responses.forEach(response => {
      const res = response.responses.find(r => r.questionId === question.id);
      if (res && res.value !== null && res.value !== undefined) {
        const key = res.value;
        if (!questionIndex.has(key)) {
          questionIndex.set(key, new Set());
        }
        questionIndex.get(key)!.add(response.id);
      }
    });

    index.set(question.id, questionIndex);
  });

  // Index by completion status
  const completionIndex = new Map<unknown, Set<string>>();
  responses.forEach(response => {
    const key = response.completed;
    if (!completionIndex.has(key)) {
      completionIndex.set(key, new Set());
    }
    completionIndex.get(key)!.add(response.id);
  });
  index.set('__completion__', completionIndex);

  // Index by timestamp (binned by date)
  const timestampIndex = new Map<unknown, Set<string>>();
  responses.forEach(response => {
    const date = new Date(response.submittedAt).toISOString().split('T')[0];
    if (!timestampIndex.has(date)) {
      timestampIndex.set(date, new Set());
    }
    timestampIndex.get(date)!.add(response.id);
  });
  index.set('__timestamp__', timestampIndex);

  return index;
}

/**
 * Fast filtering using index (for large datasets)
 */
export function filterResponsesWithIndex(
  responses: SurveyResponse[],
  survey: Survey,
  filter: ResponseFilter,
  index: Map<string, Map<unknown, Set<string>>>,
  options?: {
    biasFlags?: Map<string, BiasFlags>;
    annotations?: Array<{ responseId: string; codes: string[]; themes: string[] }>;
  }
): SurveyResponse[] {
  // For simple equality filters, use index
  // For complex filters, fall back to regular filtering
  const responseMap = new Map(responses.map(r => [r.id, r]));

  // Evaluate filter using index where possible
  const matchingIds = new Set<string>();

  filter.groups.forEach(group => {
    const groupIds = new Set<string>();
    let isFirstCondition = true;

    group.conditions.forEach(condition => {
      let conditionIds: Set<string> | null = null;

      // Try to use index for simple equality filters
      if (condition.field === 'question' && condition.questionId && condition.operator === 'equals') {
        const questionIndex = index.get(condition.questionId);
        if (questionIndex) {
          conditionIds = questionIndex.get(condition.value) || new Set();
        }
      } else if (condition.field === 'completion' && condition.operator === 'equals') {
        const completionIndex = index.get('__completion__');
        if (completionIndex) {
          conditionIds = completionIndex.get(condition.value) || new Set();
        }
      }

      // If index lookup failed, evaluate all responses
      if (conditionIds === null) {
        const matching = filterResponses(responses, survey, {
          groups: [{ conditions: [condition], logic: 'AND' }],
          groupLogic: 'AND',
        }, options);
        conditionIds = new Set(matching.map(r => r.id));
      }

      // Apply group logic
      if (isFirstCondition) {
        groupIds.clear();
        conditionIds.forEach(id => groupIds.add(id));
        isFirstCondition = false;
      } else if (group.logic === 'AND') {
        const intersection = new Set<string>();
        groupIds.forEach(id => {
          if (conditionIds!.has(id)) {
            intersection.add(id);
          }
        });
        groupIds.clear();
        intersection.forEach(id => groupIds.add(id));
      } else {
        conditionIds.forEach(id => groupIds.add(id));
      }
    });

    // Apply group logic
    if (filter.groupLogic === 'AND') {
      if (matchingIds.size === 0) {
        groupIds.forEach(id => matchingIds.add(id));
      } else {
        const intersection = new Set<string>();
        matchingIds.forEach(id => {
          if (groupIds.has(id)) {
            intersection.add(id);
          }
        });
        matchingIds.clear();
        intersection.forEach(id => matchingIds.add(id));
      }
    } else {
      groupIds.forEach(id => matchingIds.add(id));
    }
  });

  return Array.from(matchingIds)
    .map(id => responseMap.get(id))
    .filter((r): r is SurveyResponse => r !== undefined);
}
