import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { Segment } from '@/lib/schemas/analytics';
import { computeRobustStatisticalSummary } from './statistics';
import { computeCrossTabulation } from './crossTabulation';

export interface SegmentAnalysis {
  segment: Segment;
  responses: SurveyResponse[];
  summary: {
    count: number;
    proportion: number;
    completionRate: number;
  };
  questionSummaries: Map<string, ReturnType<typeof computeRobustStatisticalSummary>>;
}

export interface ComparativeAnalysis {
  segments: SegmentAnalysis[];
  comparisons: Array<{
    questionId: string;
    segmentComparisons: Array<{
      segmentId: string;
      segmentName: string;
      mean?: number;
      median?: number;
      proportion?: number;
      distribution?: Array<{ value: unknown; count: number; proportion: number }>;
    }>;
  }>;
}

/**
 * Creates a segment from responses based on a filter
 */
export function createSegment(
  responses: SurveyResponse[],
  survey: Survey,
  name: string,
  filter: {
    questionId: string;
    operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'not-in';
    value: string | number | Array<string | number>;
  }
): Segment {
  const filteredResponses = responses.filter(response => {
    const res = response.responses.find(r => r.questionId === filter.questionId);
    if (!res || res.value === null || res.value === undefined) {
      return false;
    }

    const responseValue = res.value;
    const filterValue = filter.value;

    switch (filter.operator) {
      case 'equals':
        return String(responseValue) === String(filterValue);
      case 'not-equals':
        return String(responseValue) !== String(filterValue);
      case 'contains':
        return String(responseValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'greater-than':
        return typeof responseValue === 'number' && typeof filterValue === 'number' &&
               responseValue > filterValue;
      case 'less-than':
        return typeof responseValue === 'number' && typeof filterValue === 'number' &&
               responseValue < filterValue;
      case 'in':
        return Array.isArray(filterValue) &&
               filterValue.some(v => String(responseValue) === String(v));
      case 'not-in':
        return Array.isArray(filterValue) &&
               !filterValue.some(v => String(responseValue) === String(v));
      default:
        return false;
    }
  });

  return {
    id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: `Segment filtered by ${filter.questionId}`,
    filter,
    responseIds: filteredResponses.map(r => r.id),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Analyzes a segment with statistical summaries
 */
export function analyzeSegment(
  segment: Segment,
  allResponses: SurveyResponse[],
  survey: Survey
): SegmentAnalysis {
  const segmentResponses = allResponses.filter(r => segment.responseIds.includes(r.id));

  const questionSummaries = new Map<string, ReturnType<typeof computeRobustStatisticalSummary>>();
  
  survey.questions.forEach(question => {
    const summary = computeRobustStatisticalSummary(segmentResponses, question.id);
    questionSummaries.set(question.id, summary);
  });

  const completed = segmentResponses.filter(r => r.completed).length;
  const total = allResponses.length;

  return {
    segment,
    responses: segmentResponses,
    summary: {
      count: segmentResponses.length,
      proportion: total > 0 ? segmentResponses.length / total : 0,
      completionRate: segmentResponses.length > 0 ? completed / segmentResponses.length : 0,
    },
    questionSummaries,
  };
}

/**
 * Compares multiple segments with proper normalization
 */
export function compareSegments(
  segments: Segment[],
  allResponses: SurveyResponse[],
  survey: Survey,
  questionId: string
): ComparativeAnalysis {
  const segmentAnalyses = segments.map(segment =>
    analyzeSegment(segment, allResponses, survey)
  );

  // Build comparative analysis
  const questionSummary = computeRobustStatisticalSummary(allResponses, questionId);
  const isNumeric = questionSummary.mean !== null;

  const segmentComparisons = segmentAnalyses.map(analysis => {
    const qSummary = analysis.questionSummaries.get(questionId);
    if (!qSummary) {
      return {
        segmentId: analysis.segment.id,
        segmentName: analysis.segment.name,
      };
    }

    if (isNumeric) {
      return {
        segmentId: analysis.segment.id,
        segmentName: analysis.segment.name,
        mean: qSummary.mean || undefined,
        median: qSummary.median || undefined,
        distribution: qSummary.frequencyDistribution,
      };
    } else {
      return {
        segmentId: analysis.segment.id,
        segmentName: analysis.segment.name,
        proportion: qSummary.frequencyDistribution[0]?.proportion,
        distribution: qSummary.frequencyDistribution,
      };
    }
  });

  return {
    segments: segmentAnalyses,
    comparisons: [
      {
        questionId,
        segmentComparisons,
      },
    ],
  };
}

/**
 * Validates statistical validity of segment comparisons
 */
export function validateSegmentComparison(
  comparison: ComparativeAnalysis,
  minSampleSize: number = 30
): {
  valid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  comparison.segments.forEach(segment => {
    if (segment.responses.length < minSampleSize) {
      warnings.push(
        `Segment "${segment.segment.name}" has small sample size (${segment.responses.length} < ${minSampleSize})`
      );
      recommendations.push(
        `Consider combining "${segment.segment.name}" with other segments or collecting more data`
      );
    }

    // Check for imbalanced segments
    const totalResponses = comparison.segments.reduce(
      (sum, s) => sum + s.responses.length,
      0
    );
    const proportion = segment.responses.length / totalResponses;
    
    if (proportion < 0.05) {
      warnings.push(
        `Segment "${segment.segment.name}" is very small (${(proportion * 100).toFixed(1)}% of total)`
      );
    }
  });

  // Check for sparse subgroups
  comparison.comparisons.forEach(comp => {
    comp.segmentComparisons.forEach(segComp => {
      if (segComp.distribution) {
        const sparseCategories = segComp.distribution.filter(
          d => d.count < 5
        );
        if (sparseCategories.length > 0) {
          warnings.push(
            `Segment "${segComp.segmentName}" has sparse categories with < 5 responses`
          );
        }
      }
    });
  });

  return {
    valid: warnings.length === 0,
    warnings,
    recommendations,
  };
}
