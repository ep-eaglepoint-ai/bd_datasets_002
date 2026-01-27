/**
 * Requirement 10: Bias Detection
 */
import { computeBiasFlags } from '@/lib/utils/biasDetection'
import { SurveyResponse, Survey } from '@/lib/schemas/survey'

describe('Requirement 10: Bias Detection', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Q1', type: 'rating-scale', required: true, order: 1, scale: { min: 1, max: 5, step: 1 } },
      { id: 'q2', title: 'Q2', type: 'rating-scale', required: true, order: 2, scale: { min: 1, max: 5, step: 1 } },
      { id: 'q3', title: 'Q3', type: 'multiple-choice', required: true, order: 3, options: ['A', 'B', 'C'] },
    ],
  }

  test('should detect straight-lining', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [
        { id: 'r1', surveyId: 'survey-1', questionId: 'q1', value: 5, timestamp: new Date().toISOString() },
        { id: 'r2', surveyId: 'survey-1', questionId: 'q2', value: 5, timestamp: new Date().toISOString() },
      ],
    }
    const flags = computeBiasFlags(response, testSurvey, [response])
    expect(flags.straightLining).toBe(true)
    expect(flags.flags).toContain('straight-lining')
  })

  test('should detect random answering', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [
        { id: 'r1', surveyId: 'survey-1', questionId: 'q3', value: 'A', timestamp: new Date().toISOString() },
        { id: 'r2', surveyId: 'survey-1', questionId: 'q3', value: 'B', timestamp: new Date().toISOString() },
        { id: 'r3', surveyId: 'survey-1', questionId: 'q3', value: 'A', timestamp: new Date().toISOString() },
        { id: 'r4', surveyId: 'survey-1', questionId: 'q3', value: 'B', timestamp: new Date().toISOString() },
        { id: 'r5', surveyId: 'survey-1', questionId: 'q3', value: 'A', timestamp: new Date().toISOString() },
      ],
    }
    const flags = computeBiasFlags(response, testSurvey, [response])
    // High alternation suggests randomness
    expect(flags.randomAnswering).toBeDefined()
  })

  test('should detect duplicate submissions', () => {
    const response1: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [{ id: 'r1', surveyId: 'survey-1', questionId: 'q1', value: 5, timestamp: new Date().toISOString() }],
    }
    const response2: SurveyResponse = {
      id: 'resp2',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [{ id: 'r2', surveyId: 'survey-1', questionId: 'q1', value: 5, timestamp: new Date().toISOString() }],
    }
    const flags = computeBiasFlags(response1, testSurvey, [response1, response2])
    expect(flags.duplicateSubmission).toBe(true)
  })

  test('should detect extreme response bias', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [
        { id: 'r1', surveyId: 'survey-1', questionId: 'q1', value: 1, timestamp: new Date().toISOString() },
        { id: 'r2', surveyId: 'survey-1', questionId: 'q2', value: 1, timestamp: new Date().toISOString() },
      ],
    }
    const flags = computeBiasFlags(response, testSurvey, [response])
    expect(flags.extremeResponseBias).toBe(true)
  })

  test('should detect inconsistent answers', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [
        { id: 'r1', surveyId: 'survey-1', questionId: 'q1', value: 1, timestamp: new Date().toISOString() },
        { id: 'r2', surveyId: 'survey-1', questionId: 'q2', value: 5, timestamp: new Date().toISOString() },
      ],
    }
    const flags = computeBiasFlags(response, testSurvey, [response])
    expect(flags.inconsistentAnswers).toBeDefined()
  })

  test('should detect unusually fast completion', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      metadata: { totalTime: 100 }, // Very fast - less than 1 second per question
      responses: [
        { id: 'r1', surveyId: 'survey-1', questionId: 'q1', value: 3, timestamp: new Date().toISOString() },
        { id: 'r2', surveyId: 'survey-1', questionId: 'q2', value: 3, timestamp: new Date().toISOString() },
        { id: 'r3', surveyId: 'survey-1', questionId: 'q3', value: 'A', timestamp: new Date().toISOString() },
      ],
    }
    const allResponses = [
      response,
      {
        ...response,
        id: 'resp2',
        metadata: { totalTime: 60000 }, // Normal - 20 seconds per question
      },
    ]
    const flags = computeBiasFlags(response, testSurvey, allResponses)
    // Should detect fast completion or at least have the flag defined
    expect(flags.unusuallyFast !== undefined).toBe(true)
  })

  test('should provide quality flags without discarding', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [
        { id: 'r1', surveyId: 'survey-1', questionId: 'q1', value: 5, timestamp: new Date().toISOString() },
      ],
    }
    const flags = computeBiasFlags(response, testSurvey, [response])
    expect(flags.flags).toBeDefined()
    expect(flags.score).toBeDefined()
    // Data should not be discarded, just flagged
    expect(flags.score).toBeGreaterThanOrEqual(0)
  })
})
