import { SurveyResponse, Survey } from '@/lib/schemas/survey';
import { BiasFlags } from '@/lib/schemas/analytics';

/**
 * Detects straight-lining (same answer pattern)
 */
export function detectStraightLining(
  response: SurveyResponse,
  survey: Survey
): boolean {
  const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');
  if (ratingQuestions.length < 2) return false;

  const ratings = ratingQuestions.map(q => {
    const res = response.responses.find(r => r.questionId === q.id);
    return typeof res?.value === 'number' ? res.value : null;
  }).filter((v): v is number => v !== null);

  if (ratings.length < 2) return false;

  // Check if all ratings are the same
  const allSame = ratings.every(r => r === ratings[0]);
  if (allSame) return true;

  // Check for extreme patterns (all min or all max)
  const allMin = ratings.every(r => r === Math.min(...ratings));
  const allMax = ratings.every(r => r === Math.max(...ratings));

  return allMin || allMax;
}

/**
 * Detects random answering patterns
 */
export function detectRandomAnswering(
  response: SurveyResponse,
  survey: Survey
): boolean {
  const multipleChoiceQuestions = survey.questions.filter(q => q.type === 'multiple-choice');
  if (multipleChoiceQuestions.length < 5) return false;

  const answers = multipleChoiceQuestions.map(q => {
    const res = response.responses.find(r => r.questionId === q.id);
    return res?.value;
  }).filter(v => v !== null && v !== undefined);

  if (answers.length < 5) return false;

  // Check for alternating pattern
  let alternations = 0;
  for (let i = 1; i < answers.length; i++) {
    if (answers[i] !== answers[i - 1]) alternations++;
  }

  // High alternation rate suggests randomness
  const alternationRate = alternations / (answers.length - 1);
  return alternationRate > 0.8;
}

/**
 * Detects duplicate submissions
 */
export function detectDuplicateSubmission(
  response: SurveyResponse,
  allResponses: SurveyResponse[]
): boolean {
  const responseSignature = JSON.stringify(
    response.responses
      .map(r => ({ questionId: r.questionId, value: r.value }))
      .sort((a, b) => a.questionId.localeCompare(b.questionId))
  );

  const duplicates = allResponses.filter(r => {
    if (r.id === response.id) return false;
    const signature = JSON.stringify(
      r.responses
        .map(res => ({ questionId: res.questionId, value: res.value }))
        .sort((a, b) => a.questionId.localeCompare(b.questionId))
    );
    return signature === responseSignature;
  });

  return duplicates.length > 0;
}

/**
 * Detects extreme response bias
 */
export function detectExtremeResponseBias(
  response: SurveyResponse,
  survey: Survey
): boolean {
  const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');
  if (ratingQuestions.length < 2) return false;

  const ratings = ratingQuestions.map(q => {
    const res = response.responses.find(r => r.questionId === q.id);
    if (q.type === 'rating-scale' && typeof res?.value === 'number') {
      const scale = q.scale;
      const normalized = (res.value - scale.min) / (scale.max - scale.min);
      return normalized;
    }
    return null;
  }).filter((v): v is number => v !== null);

  if (ratings.length < 2) return false;

  // Check if most responses are at extremes (top 10% or bottom 10%)
  const extremeCount = ratings.filter(r => r <= 0.1 || r >= 0.9).length;
  const extremeRate = extremeCount / ratings.length;

  // For 2 questions, both must be extreme; for more, need >70%
  return ratings.length === 2 ? extremeRate >= 1.0 : extremeRate > 0.7;
}

/**
 * Detects inconsistent answers (contradictory responses)
 */
export function detectInconsistentAnswers(
  response: SurveyResponse,
  survey: Survey
): boolean {
  // This is a simplified check - full implementation would need domain knowledge
  // Example: if someone says they never use a product but rate it highly
  
  // For now, check for logical contradictions in rating scales
  const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');
  if (ratingQuestions.length < 2) return false;

  const ratings = ratingQuestions.map(q => {
    const res = response.responses.find(r => r.questionId === q.id);
    return typeof res?.value === 'number' ? res.value : null;
  }).filter((v): v is number => v !== null);

  if (ratings.length < 2) return false;

  // Check for high variance that might indicate inconsistency
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
  const stdDev = Math.sqrt(variance);

  // If standard deviation is very high relative to the scale, might be inconsistent
  const maxRating = Math.max(...ratings);
  const minRating = Math.min(...ratings);
  const range = maxRating - minRating;

  return stdDev > range * 0.5 && range > 0;
}

/**
 * Detects unusually fast completion
 */
export function detectUnusuallyFast(
  response: SurveyResponse,
  survey: Survey,
  allResponses: SurveyResponse[]
): boolean {
  if (!response.metadata?.totalTime) return false;

  const questionCount = Math.max(survey.questions.length, 1);
  const timePerQuestion = response.metadata.totalTime / questionCount;

  // Calculate average time per question from all responses
  const avgTimes = allResponses
    .filter(r => r.metadata?.totalTime && r.metadata.totalTime > 0)
    .map(r => (r.metadata!.totalTime! / Math.max(survey.questions.length, 1)))
    .filter(t => t > 0);

  if (avgTimes.length < 2) {
    // If we don't have enough data, use a heuristic: < 1 second per question is suspicious
    return timePerQuestion < 1000 && questionCount > 0;
  }

  const avgTime = avgTimes.reduce((sum, t) => sum + t, 0) / avgTimes.length;
  const variance = avgTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / avgTimes.length;
  const stdDev = Math.sqrt(variance);

  // If time is more than 2 standard deviations below average, or if stdDev is 0 and time is much lower
  if (stdDev === 0) {
    return timePerQuestion < avgTime * 0.1 && timePerQuestion > 0;
  }
  return timePerQuestion < avgTime - 2 * stdDev && timePerQuestion > 0;
}

/**
 * Computes comprehensive bias flags for a response
 */
export function computeBiasFlags(
  response: SurveyResponse,
  survey: Survey,
  allResponses: SurveyResponse[]
): BiasFlags {
  const flags: string[] = [];
  let score = 1.0; // Start with perfect score

  const straightLining = detectStraightLining(response, survey);
  if (straightLining) {
    flags.push('straight-lining');
    score -= 0.3;
  }

  const randomAnswering = detectRandomAnswering(response, survey);
  if (randomAnswering) {
    flags.push('random-answering');
    score -= 0.3;
  }

  const duplicate = detectDuplicateSubmission(response, allResponses);
  if (duplicate) {
    flags.push('duplicate-submission');
    score -= 0.2;
  }

  const extremeBias = detectExtremeResponseBias(response, survey);
  if (extremeBias) {
    flags.push('extreme-response-bias');
    score -= 0.2;
  }

  const inconsistent = detectInconsistentAnswers(response, survey);
  if (inconsistent) {
    flags.push('inconsistent-answers');
    score -= 0.2;
  }

  const unusuallyFast = detectUnusuallyFast(response, survey, allResponses);
  if (unusuallyFast) {
    flags.push('unusually-fast');
    score -= 0.1;
  }

  return {
    straightLining,
    randomAnswering,
    duplicateSubmission: duplicate,
    extremeResponseBias: extremeBias,
    inconsistentAnswers: inconsistent,
    unusuallyFast,
    flags,
    score: Math.max(0, score),
  };
}
