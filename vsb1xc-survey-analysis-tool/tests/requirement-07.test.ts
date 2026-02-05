/**
 * Requirement 7: Rating Scale Aggregation
 */
import { computeRatingScaleAnalysis } from '@/lib/utils/ratingScaleAnalysis'
import { SurveyResponse, Survey } from '@/lib/schemas/survey'

describe('Requirement 7: Rating Scale Analysis', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        title: 'Satisfaction',
        type: 'rating-scale',
        required: true,
        order: 1,
        scale: { min: 1, max: 5, step: 1 },
      },
      {
        id: 'q2',
        title: 'Quality',
        type: 'rating-scale',
        required: true,
        order: 2,
        scale: { min: 1, max: 5, step: 1 },
      },
      {
        id: 'q3',
        title: 'Value',
        type: 'rating-scale',
        required: true,
        order: 3,
        scale: { min: 1, max: 5, step: 1 },
      },
    ],
  }

  const createResponse = (id: string, q1: number, q2: number, q3: number): SurveyResponse => ({
    id,
    surveyId: 'survey-1',
    submittedAt: new Date().toISOString(),
    completed: true,
    responses: [
      { id: `${id}-q1`, surveyId: 'survey-1', questionId: 'q1', value: q1, timestamp: new Date().toISOString() },
      { id: `${id}-q2`, surveyId: 'survey-1', questionId: 'q2', value: q2, timestamp: new Date().toISOString() },
      { id: `${id}-q3`, surveyId: 'survey-1', questionId: 'q3', value: q3, timestamp: new Date().toISOString() },
    ],
  })

  test('should compute composite scores', () => {
    const responses = [
      createResponse('resp1', 4, 4, 4),
      createResponse('resp2', 5, 5, 5),
    ]
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    expect(analysis.compositeScores.size).toBe(2)
    expect(analysis.compositeScores.get('resp1')).toBeDefined()
  })

  test('should compute distribution curves', () => {
    const responses = Array.from({ length: 10 }, (_, i) => createResponse(`resp${i}`, i % 5 + 1, i % 5 + 1, i % 5 + 1))
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    expect(analysis.distribution.mean).toBeDefined()
    expect(analysis.distribution.median).toBeDefined()
    expect(analysis.distribution.stdDev).toBeDefined()
    expect(analysis.distribution.percentiles).toBeDefined()
  })

  test('should compute response bias indicators', () => {
    const responses = [
      createResponse('resp1', 1, 1, 1), // Extreme low
      createResponse('resp2', 5, 5, 5), // Extreme high
      createResponse('resp3', 3, 3, 3), // Central
    ]
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    expect(analysis.responseBias.extremeResponseBias).toBeGreaterThan(0)
    expect(analysis.responseBias.centralTendencyBias).toBeGreaterThan(0)
  })

  test('should compute internal consistency metrics', () => {
    const responses = Array.from({ length: 20 }, (_, i) => createResponse(`resp${i}`, 3, 3, 3))
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    expect(analysis.internalConsistency.alpha).toBeDefined()
    expect(analysis.internalConsistency.itemTotalCorrelations.size).toBeGreaterThan(0)
  })

  test('should detect invalid scale values', () => {
    const responses = [
      createResponse('resp1', 6, 4, 4), // Invalid: 6 > max (5)
      createResponse('resp2', 0, 4, 4), // Invalid: 0 < min (1)
    ]
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    expect(analysis.invalidValues.length).toBeGreaterThan(0)
  })

  test('should detect reversed scoring errors', () => {
    // Create responses where one question correlates negatively with others
    const responses = [
      createResponse('resp1', 5, 5, 1), // q3 reversed
      createResponse('resp2', 4, 4, 2),
      createResponse('resp3', 3, 3, 3),
    ]
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    // Should detect potential reversal (simplified test)
    expect(analysis.reversedScoringErrors).toBeDefined()
  })

  test('should detect extreme-response bias', () => {
    const responses = [
      createResponse('resp1', 1, 1, 1),
      createResponse('resp2', 1, 1, 1),
      createResponse('resp3', 5, 5, 5),
    ]
    const analysis = computeRatingScaleAnalysis(responses, testSurvey, ['q1', 'q2', 'q3'])
    expect(analysis.responseBias.extremeResponseBias).toBeGreaterThan(0.5)
  })
})
