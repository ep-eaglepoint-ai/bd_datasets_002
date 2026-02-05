import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { ResponseQualityMetrics } from '@/lib/schemas/analytics';

/**
 * Computes completion rate for responses
 */
export function computeCompletionRate(responses: SurveyResponse[]): number {
  if (responses.length === 0) return 0;
  const completed = responses.filter(r => r.completed).length;
  return completed / responses.length;
}

/**
 * Identifies dropout points (where users stop responding)
 */
export function identifyDropoutPoints(
  responses: SurveyResponse[],
  survey: Survey
): Map<string, { questionId: string; questionTitle: string; dropoutCount: number; dropoutRate: number }> {
  const dropoutMap = new Map<string, { questionId: string; questionTitle: string; dropoutCount: number; dropoutRate: number }>();

  // Sort questions by order
  const sortedQuestions = [...survey.questions].sort((a, b) => a.order - b.order);

  sortedQuestions.forEach((question, index) => {
    // Count responses that have this question but not the next one
    let dropoutCount = 0;

    responses.forEach(response => {
      const hasCurrent = response.responses.some(r => r.questionId === question.id);
      const hasNext = index < sortedQuestions.length - 1
        ? response.responses.some(r => r.questionId === sortedQuestions[index + 1].id)
        : true; // Last question can't have dropouts

      if (hasCurrent && !hasNext) {
        dropoutCount++;
      }
    });

    const totalResponses = responses.length;
    dropoutMap.set(question.id, {
      questionId: question.id,
      questionTitle: question.title,
      dropoutCount,
      dropoutRate: totalResponses > 0 ? dropoutCount / totalResponses : 0,
    });
  });

  return dropoutMap;
}

/**
 * Computes average response time per question
 */
export function computeAverageResponseTime(
  responses: SurveyResponse[],
  questionId: string
): number | null {
  const questionResponses = responses
    .flatMap(r => r.responses.filter(res => res.questionId === questionId))
    .filter(res => res.metadata?.responseTime !== undefined && res.metadata.responseTime > 0);

  if (questionResponses.length === 0) return null;

  const totalTime = questionResponses.reduce(
    (sum, res) => sum + (res.metadata!.responseTime || 0),
    0
  );

  return totalTime / questionResponses.length;
}

/**
 * Computes item non-response rate for each question
 */
export function computeItemNonResponseRates(
  responses: SurveyResponse[],
  survey: Survey
): Map<string, { questionId: string; questionTitle: string; nonResponseCount: number; nonResponseRate: number }> {
  const nonResponseMap = new Map<string, { questionId: string; questionTitle: string; nonResponseCount: number; nonResponseRate: number }>();

  survey.questions.forEach(question => {
    const nonResponseCount = responses.filter(response => {
      const res = response.responses.find(r => r.questionId === question.id);
      return !res || res.value === null || res.value === undefined;
    }).length;

    nonResponseMap.set(question.id, {
      questionId: question.id,
      questionTitle: question.title,
      nonResponseCount,
      nonResponseRate: responses.length > 0 ? nonResponseCount / responses.length : 0,
    });
  });

  return nonResponseMap;
}

/**
 * Computes engagement curve (response rate over question order)
 */
export function computeEngagementCurve(
  responses: SurveyResponse[],
  survey: Survey
): Array<{ questionOrder: number; questionId: string; questionTitle: string; responseRate: number; averageTime: number | null }> {
  const sortedQuestions = [...survey.questions].sort((a, b) => a.order - b.order);

  return sortedQuestions.map(question => {
    const responsesWithAnswer = responses.filter(response => {
      const res = response.responses.find(r => r.questionId === question.id);
      return res && res.value !== null && res.value !== undefined;
    }).length;

    const responseRate = responses.length > 0 ? responsesWithAnswer / responses.length : 0;
    const averageTime = computeAverageResponseTime(responses, question.id);

    return {
      questionOrder: question.order,
      questionId: question.id,
      questionTitle: question.title,
      responseRate,
      averageTime,
    };
  });
}

/**
 * Computes comprehensive response quality metrics
 */
export function computeResponseQualityMetrics(
  responses: SurveyResponse[],
  survey: Survey
): ResponseQualityMetrics {
  const completionRate = computeCompletionRate(responses);
  const dropoutPoints = identifyDropoutPoints(responses, survey);
  
  // Find the question with highest dropout rate
  let maxDropout = 0;
  let dropoutPoint: string | null = null;
  dropoutPoints.forEach((data, questionId) => {
    if (data.dropoutRate > maxDropout) {
      maxDropout = data.dropoutRate;
      dropoutPoint = questionId;
    }
  });

  // Compute average response time per question
  const responseTimes: number[] = [];
  survey.questions.forEach(question => {
    const avgTime = computeAverageResponseTime(responses, question.id);
    if (avgTime !== null) {
      responseTimes.push(avgTime);
    }
  });
  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0;

  // Compute item non-response rate (average across all questions)
  const nonResponseRates = computeItemNonResponseRates(responses, survey);
  const itemNonResponseRate = Array.from(nonResponseRates.values())
    .reduce((sum, data) => sum + data.nonResponseRate, 0) / nonResponseRates.size;

  // Compute engagement curve
  const engagementCurve = computeEngagementCurve(responses, survey);

  return {
    completionRate,
    dropoutPoint,
    averageResponseTime,
    itemNonResponseRate,
    engagementCurve: engagementCurve.map(point => ({
      questionId: point.questionId,
      responseTime: point.averageTime || 0,
      timestamp: new Date().toISOString(), // Would use actual timestamps in production
    })),
  };
}

/**
 * Handles partial submissions and irregular completion flows
 */
export function analyzeCompletionFlow(
  responses: SurveyResponse[],
  survey: Survey
): {
  partialSubmissions: SurveyResponse[];
  completionPatterns: Array<{
    pattern: string; // e.g., "1-5,7-10" for questions answered
    count: number;
    responses: SurveyResponse[];
  }>;
  irregularFlows: Array<{
    responseId: string;
    issues: string[];
  }>;
} {
  const partialSubmissions = responses.filter(r => !r.completed);

  // Analyze completion patterns
  const patternMap = new Map<string, SurveyResponse[]>();
  
  responses.forEach(response => {
    const answeredQuestions = response.responses
      .filter(r => r.value !== null && r.value !== undefined)
      .map(r => {
        const question = survey.questions.find(q => q.id === r.questionId);
        return question?.order ?? -1;
      })
      .filter(order => order >= 0)
      .sort((a, b) => a - b);

    if (answeredQuestions.length === 0) return;

    // Create pattern string (e.g., "1-3,5,7-10")
    const pattern: string[] = [];
    let start = answeredQuestions[0];
    let end = answeredQuestions[0];

    for (let i = 1; i < answeredQuestions.length; i++) {
      if (answeredQuestions[i] === end + 1) {
        end = answeredQuestions[i];
      } else {
        if (start === end) {
          pattern.push(String(start));
        } else {
          pattern.push(`${start}-${end}`);
        }
        start = answeredQuestions[i];
        end = answeredQuestions[i];
      }
    }
    if (start === end) {
      pattern.push(String(start));
    } else {
      pattern.push(`${start}-${end}`);
    }

    const patternStr = pattern.join(',');
    if (!patternMap.has(patternStr)) {
      patternMap.set(patternStr, []);
    }
    patternMap.get(patternStr)!.push(response);
  });

  const completionPatterns = Array.from(patternMap.entries())
    .map(([pattern, responses]) => ({
      pattern,
      count: responses.length,
      responses,
    }))
    .sort((a, b) => b.count - a.count);

  // Detect irregular flows (e.g., skipping questions, answering out of order)
  const irregularFlows: Array<{ responseId: string; issues: string[] }> = [];

  responses.forEach(response => {
    const issues: string[] = [];
    const answeredOrders = response.responses
      .filter(r => r.value !== null && r.value !== undefined)
      .map(r => {
        const question = survey.questions.find(q => q.id === r.questionId);
        return question?.order ?? -1;
      })
      .filter(order => order >= 0)
      .sort((a, b) => a - b);

    if (answeredOrders.length === 0) {
      issues.push('No questions answered');
    } else {
      // Check for gaps (skipped questions)
      for (let i = 1; i < answeredOrders.length; i++) {
        if (answeredOrders[i] - answeredOrders[i - 1] > 1) {
          issues.push(`Skipped questions between ${answeredOrders[i - 1]} and ${answeredOrders[i]}`);
        }
      }

      // Check if required questions were skipped
      survey.questions.forEach(question => {
        if (question.required) {
          const answered = response.responses.some(
            r => r.questionId === question.id && r.value !== null && r.value !== undefined
          );
          if (!answered) {
            issues.push(`Required question "${question.title}" not answered`);
          }
        }
      });
    }

    if (issues.length > 0) {
      irregularFlows.push({ responseId: response.id, issues });
    }
  });

  return {
    partialSubmissions,
    completionPatterns,
    irregularFlows,
  };
}
