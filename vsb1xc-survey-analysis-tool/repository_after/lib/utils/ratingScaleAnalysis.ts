import { SurveyResponse, Survey, Question } from '@/lib/schemas/survey';

export interface RatingScaleAnalysis {
  questionIds: string[];
  compositeScores: Map<string, number>; // responseId -> composite score
  distribution: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    percentiles: Record<number, number>;
  };
  responseBias: {
    extremeResponseBias: number; // proportion with extreme responses
    centralTendencyBias: number; // proportion avoiding extremes
    acquiescenceBias: number; // proportion agreeing/positive
  };
  internalConsistency: {
    cronbachAlpha: number | null;
    itemTotalCorrelations: Map<string, number>;
    warnings: string[];
  };
  invalidValues: Array<{
    responseId: string;
    questionId: string;
    value: number;
    reason: string;
  }>;
  reversedScoringErrors: Array<{
    questionId: string;
    expectedDirection: 'positive' | 'negative';
    detectedDirection: 'positive' | 'negative';
  }>;
}

/**
 * Detects invalid scale values
 */
function detectInvalidScaleValues(
  responses: SurveyResponse[],
  questions: Question[]
): Array<{ responseId: string; questionId: string; value: number; reason: string }> {
  const invalid: Array<{ responseId: string; questionId: string; value: number; reason: string }> = [];

  responses.forEach(response => {
    questions.forEach(question => {
      if (question.type !== 'rating-scale') return;

      const res = response.responses.find(r => r.questionId === question.id);
      if (!res || typeof res.value !== 'number') return;

      const value = res.value;
      const scale = question.scale;

      if (value < scale.min || value > scale.max) {
        invalid.push({
          responseId: response.id,
          questionId: question.id,
          value,
          reason: `Value ${value} outside valid range [${scale.min}, ${scale.max}]`,
        });
      }

      // Check if value matches step increments
      if (scale.step > 1) {
        const normalized = (value - scale.min) / scale.step;
        if (!Number.isInteger(normalized)) {
          invalid.push({
            responseId: response.id,
            questionId: question.id,
            value,
            reason: `Value ${value} does not match step increment of ${scale.step}`,
          });
        }
      }
    });
  });

  return invalid;
}

/**
 * Detects reversed scoring errors by checking correlation patterns
 */
function detectReversedScoring(
  responses: SurveyResponse[],
  questions: Question[]
): Array<{
  questionId: string;
  expectedDirection: 'positive' | 'negative';
  detectedDirection: 'positive' | 'negative';
}> {
  const errors: Array<{
    questionId: string;
    expectedDirection: 'positive' | 'negative';
    detectedDirection: 'positive' | 'negative';
  }> = [];

  if (questions.length < 2) return errors;

  // Extract rating values for all questions
  const questionValues = new Map<string, number[]>();
  questions.forEach(question => {
    if (question.type !== 'rating-scale') return;
    const values: number[] = [];
    responses.forEach(response => {
      const res = response.responses.find(r => r.questionId === question.id);
      if (res && typeof res.value === 'number') {
        values.push(res.value);
      }
    });
    questionValues.set(question.id, values);
  });

  // Compute correlations between questions
  // If most questions correlate positively but one correlates negatively,
  // it might be reversed
  const questionIds = Array.from(questionValues.keys());
  
  for (let i = 0; i < questionIds.length; i++) {
    const q1Id = questionIds[i];
    const q1Values = questionValues.get(q1Id)!;
    
    if (q1Values.length < 3) continue;

    let positiveCorrelations = 0;
    let negativeCorrelations = 0;

    for (let j = 0; j < questionIds.length; j++) {
      if (i === j) continue;
      const q2Id = questionIds[j];
      const q2Values = questionValues.get(q2Id)!;

      if (q2Values.length !== q1Values.length) continue;

      // Compute Pearson correlation
      const mean1 = q1Values.reduce((a, b) => a + b, 0) / q1Values.length;
      const mean2 = q2Values.reduce((a, b) => a + b, 0) / q2Values.length;

      let numerator = 0;
      let sumSq1 = 0;
      let sumSq2 = 0;

      for (let k = 0; k < q1Values.length; k++) {
        const diff1 = q1Values[k] - mean1;
        const diff2 = q2Values[k] - mean2;
        numerator += diff1 * diff2;
        sumSq1 += diff1 * diff1;
        sumSq2 += diff2 * diff2;
      }

      const denominator = Math.sqrt(sumSq1 * sumSq2);
      if (denominator > 0) {
        const correlation = numerator / denominator;
        if (correlation > 0.3) positiveCorrelations++;
        else if (correlation < -0.3) negativeCorrelations++;
      }
    }

    // If this question correlates negatively with most others, might be reversed
    if (negativeCorrelations > positiveCorrelations * 2 && negativeCorrelations >= 2) {
      errors.push({
        questionId: q1Id,
        expectedDirection: 'positive',
        detectedDirection: 'negative',
      });
    }
  }

  return errors;
}

/**
 * Computes Cronbach's alpha for internal consistency
 */
function computeCronbachAlpha(
  responses: SurveyResponse[],
  questions: Question[]
): { alpha: number | null; itemTotalCorrelations: Map<string, number>; warnings: string[] } {
  const warnings: string[] = [];
  const itemTotalCorrelations = new Map<string, number>();

  if (questions.length < 2) {
    warnings.push('Need at least 2 items for internal consistency calculation');
    return { alpha: null, itemTotalCorrelations, warnings };
  }

  // Extract values for each question
  const questionValues = new Map<string, number[]>();
  questions.forEach(question => {
    if (question.type !== 'rating-scale') return;
    const values: number[] = [];
    responses.forEach(response => {
      const res = response.responses.find(r => r.questionId === question.id);
      if (res && typeof res.value === 'number') {
        values.push(res.value);
      }
    });
    questionValues.set(question.id, values);
  });

  const validQuestionIds = Array.from(questionValues.keys());
  if (validQuestionIds.length < 2) {
    warnings.push('Insufficient valid rating-scale questions');
    return { alpha: null, itemTotalCorrelations, warnings };
  }

  // Align values by response (only include responses with all values)
  const alignedData: Array<Record<string, number>> = [];
  responses.forEach(response => {
    const row: Record<string, number> = {};
    let hasAllValues = true;

    validQuestionIds.forEach(qId => {
      const res = response.responses.find(r => r.questionId === qId);
      if (res && typeof res.value === 'number') {
        row[qId] = res.value;
      } else {
        hasAllValues = false;
      }
    });

    if (hasAllValues) {
      alignedData.push(row);
    }
  });

  if (alignedData.length < 3) {
    warnings.push('Insufficient complete responses for reliability calculation');
    return { alpha: null, itemTotalCorrelations, warnings };
  }

  // Compute item variances and total score variance
  const itemVariances: number[] = [];
  const totalScores: number[] = [];

  validQuestionIds.forEach(qId => {
    const values = alignedData.map(row => row[qId]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    itemVariances.push(variance);

    // Compute item-total correlation
    const totalScoresForCorrelation = alignedData.map(row =>
      validQuestionIds.reduce((sum, id) => sum + row[id], 0)
    );
    const itemTotalMean = values.reduce((a, b) => a + b, 0) / values.length;
    const totalMean =
      totalScoresForCorrelation.reduce((a, b) => a + b, 0) / totalScoresForCorrelation.length;

    let numerator = 0;
    let sumSqItem = 0;
    let sumSqTotal = 0;

    for (let i = 0; i < values.length; i++) {
      const diffItem = values[i] - itemTotalMean;
      const diffTotal = totalScoresForCorrelation[i] - totalMean;
      numerator += diffItem * diffTotal;
      sumSqItem += diffItem * diffItem;
      sumSqTotal += diffTotal * diffTotal;
    }

    const denominator = Math.sqrt(sumSqItem * sumSqTotal);
    const correlation = denominator > 0 ? numerator / denominator : 0;
    itemTotalCorrelations.set(qId, correlation);
  });

  // Compute total scores
  alignedData.forEach(row => {
    const total = validQuestionIds.reduce((sum, id) => sum + row[id], 0);
    totalScores.push(total);
  });

  const totalMean = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
  const totalVariance =
    totalScores.reduce((sum, v) => sum + Math.pow(v - totalMean, 2), 0) / totalScores.length;

  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);
  const k = validQuestionIds.length;

  // Cronbach's alpha formula
  const alpha = (k / (k - 1)) * (1 - sumItemVariances / totalVariance);

  if (isNaN(alpha) || !isFinite(alpha)) {
    warnings.push('Could not compute Cronbach\'s alpha (invalid calculation)');
    return { alpha: null, itemTotalCorrelations, warnings };
  }

  if (alpha < 0.7) {
    warnings.push(`Low internal consistency (α = ${alpha.toFixed(3)} < 0.7)`);
  }

  return {
    alpha: Math.max(0, Math.min(1, alpha)), // Clamp between 0 and 1
    itemTotalCorrelations,
    warnings,
  };
}

/**
 * Computes composite scores for rating-scale questions
 */
export function computeRatingScaleAnalysis(
  responses: SurveyResponse[],
  survey: Survey,
  questionIds: string[]
): RatingScaleAnalysis {
  const questions = survey.questions.filter(
    q => questionIds.includes(q.id) && q.type === 'rating-scale'
  );

  if (questions.length === 0) {
    throw new Error('No rating-scale questions found');
  }

  // Compute composite scores (average of all rating questions)
  const compositeScores = new Map<string, number>();
  responses.forEach(response => {
    const ratings: number[] = [];
    questions.forEach(question => {
      const res = response.responses.find(r => r.questionId === question.id);
      if (res && typeof res.value === 'number') {
        const value = res.value;
        const scale = question.scale;
        // Normalize to 0-1 scale for composite
        const normalized = (value - scale.min) / (scale.max - scale.min);
        ratings.push(normalized);
      }
    });

    if (ratings.length > 0) {
      const composite = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      compositeScores.set(response.id, composite);
    }
  });

  // Compute distribution of composite scores
  const allComposites = Array.from(compositeScores.values());
  const mean = allComposites.reduce((a, b) => a + b, 0) / allComposites.length;
  const variance =
    allComposites.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / allComposites.length;
  const stdDev = Math.sqrt(variance);
  const sorted = [...allComposites].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const percentiles: Record<number, number> = {};
  [10, 25, 50, 75, 90].forEach(p => {
    const index = Math.floor((sorted.length * p) / 100);
    percentiles[p] = sorted[Math.min(index, sorted.length - 1)];
  });

  // Compute response bias indicators
  let extremeCount = 0;
  let centralCount = 0;
  let positiveCount = 0;

  responses.forEach(response => {
    const ratings: number[] = [];
    questions.forEach(question => {
      const res = response.responses.find(r => r.questionId === question.id);
      if (res && typeof res.value === 'number') {
        const value = res.value;
        const scale = question.scale;
        const normalized = (value - scale.min) / (scale.max - scale.min);
        ratings.push(normalized);
      }
    });

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      // Extreme response bias (top or bottom 10%)
      if (avgRating <= 0.1 || avgRating >= 0.9) {
        extremeCount++;
      }
      
      // Central tendency bias (middle 40%)
      if (avgRating >= 0.3 && avgRating <= 0.7) {
        centralCount++;
      }
      
      // Acquiescence bias (positive responses, > 0.6)
      if (avgRating > 0.6) {
        positiveCount++;
      }
    }
  });

  const total = responses.length;
  const responseBias = {
    extremeResponseBias: total > 0 ? extremeCount / total : 0,
    centralTendencyBias: total > 0 ? centralCount / total : 0,
    acquiescenceBias: total > 0 ? positiveCount / total : 0,
  };

  // Detect invalid values
  const invalidValues = detectInvalidScaleValues(responses, questions);

  // Detect reversed scoring
  const reversedScoringErrors = detectReversedScoring(responses, questions);

  // Compute internal consistency
  const internalConsistency = computeCronbachAlpha(responses, questions);

  return {
    questionIds: questions.map(q => q.id),
    compositeScores,
    distribution: {
      mean,
      median,
      stdDev,
      min: Math.min(...allComposites),
      max: Math.max(...allComposites),
      percentiles,
    },
    responseBias,
    internalConsistency,
    invalidValues,
    reversedScoringErrors,
  };
}
