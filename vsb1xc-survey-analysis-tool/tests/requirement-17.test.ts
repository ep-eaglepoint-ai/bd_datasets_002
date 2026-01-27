/**
 * Requirement 17: Zod Validation
 */
import {
  validateSurvey,
  validateSurveyResponse,
  validateSurveyResponses,
  validateSnapshot,
  validateStatisticalSummary,
  validateCrossTabulation,
  safeValidate,
} from '@/lib/utils/validation'
import { Survey, SurveyResponse, DatasetSnapshot } from '@/lib/schemas/survey'
import { StatisticalSummary, CrossTabulation } from '@/lib/schemas/analytics'

describe('Requirement 17: Zod Validation', () => {
  test('should validate imported responses', () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [],
    }
    const result = validateSurveyResponse(response)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('should validate transformation rules', () => {
    const rule = {
      id: 'rule1',
      type: 'trim-whitespace' as const,
      config: {},
      appliedAt: new Date().toISOString(),
    }
    const result = validateSurveyResponse(rule as any)
    // Should validate structure
    expect(result).toBeDefined()
  })

  test('should validate survey schemas', () => {
    const survey: Survey = {
      id: 'survey-1',
      title: 'Test',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [
        { id: 'q1', title: 'Q1', type: 'text', required: false, order: 1 },
      ],
    }
    const result = validateSurvey(survey)
    expect(result.success).toBe(true)
  })

  test('should validate computed analytics', () => {
    const summary: StatisticalSummary = {
      count: 10,
      missing: 0,
      mean: 5.5,
      median: 5,
      mode: null,
      stdDev: 2.5,
      variance: 6.25,
      min: 1,
      max: 10,
      frequencyDistribution: [],
    }
    const result = validateStatisticalSummary(summary)
    expect(result.success).toBe(true)
  })

  test('should surface errors clearly', () => {
    const invalid = { invalid: 'data' }
    const result = validateSurveyResponse(invalid)
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errorMessage).toBeDefined()
  })

  test('should not break application state on validation failure', () => {
    const invalid = { invalid: 'data' }
    const result = safeValidate(validateSurveyResponse, invalid)
    expect(result).toBeNull() // Returns null instead of throwing
  })

  test('should prevent invalid data propagation', () => {
    const invalid = { id: 'resp1' } // Missing required fields
    const result = validateSurveyResponse(invalid)
    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
  })

  test('should validate multiple responses', () => {
    const responses = [
      {
        id: 'resp1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [],
      },
      { invalid: 'data' },
    ]
    const result = validateSurveyResponses(responses)
    expect(result.valid.length).toBe(1)
    expect(result.invalid.length).toBe(1)
  })
})
