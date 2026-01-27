/**
 * Requirement 22: Edge Case Handling
 */
import {
  handleSmallSample,
  handleLargeDataset,
  detectContradictions,
  handleCorruptedImport,
  handleMultilingualText,
  detectBiasedSampling,
  detectAnnotationConflicts,
  handleSchemaEvolution,
} from '@/lib/utils/edgeCaseHandling'
import { SurveyResponse, Survey } from '@/lib/schemas/survey'

describe('Requirement 22: Edge Cases', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Q1', type: 'numeric', required: false, order: 1 },
    ],
  }

  test('should handle extremely small sample sizes', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [{ id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 1, timestamp: new Date().toISOString() }],
      },
    ]
    const result = handleSmallSample(responses, 'q1')
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  test('should handle massive datasets', () => {
    const largeResponses = Array.from({ length: 100000 }, (_, i) => ({
      id: `r${i}`,
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [],
    }))
    const result = handleLargeDataset(largeResponses)
    expect(result.needsOptimization).toBe(true)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  test('should detect contradictory responses', () => {
    const response: SurveyResponse = {
      id: 'r1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [
        { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 1, timestamp: new Date().toISOString() },
      ],
    }
    const surveyWithRatings: Survey = {
      ...testSurvey,
      questions: [
        { id: 'q1', title: 'Q1', type: 'rating-scale', required: false, order: 1, scale: { min: 1, max: 5, step: 1 } },
        { id: 'q2', title: 'Q2', type: 'rating-scale', required: false, order: 2, scale: { min: 1, max: 5, step: 1 } },
      ],
    }
    const responseWithContradiction: SurveyResponse = {
      ...response,
      responses: [
        { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 1, timestamp: new Date().toISOString() },
        { id: 'r1-q2', surveyId: 'survey-1', questionId: 'q2', value: 5, timestamp: new Date().toISOString() },
      ],
    }
    const result = detectContradictions(responseWithContradiction, surveyWithRatings)
    expect(result.contradictions).toBeDefined()
  })

  test('should handle corrupted imports', () => {
    const corrupted = [
      { id: 'r1', valid: true },
      { invalid: 'data' },
      null,
    ]
    const result = handleCorruptedImport(corrupted, { fields: ['id', 'surveyId'] })
    expect(result.valid.length).toBeLessThan(corrupted.length)
    expect(result.corrupted.length).toBeGreaterThan(0)
  })

  test('should handle multilingual text', () => {
    const result = handleMultilingualText('This is good. Это хорошо. 这是好的.')
    expect(result.isMultilingual).toBe(true)
    expect(result.detectedLanguages.length).toBeGreaterThan(1)
  })

  test('should detect biased sampling patterns', () => {
    const responses: SurveyResponse[] = Array.from({ length: 10 }, (_, i) => ({
      id: `r${i}`,
      surveyId: 'survey-1',
      submittedAt: new Date(Date.now() - i * 1000).toISOString(), // All within seconds
      completed: i % 2 === 0,
      responses: [],
    }))
    const result = detectBiasedSampling(responses, testSurvey)
    expect(result.biases.length).toBeGreaterThan(0)
  })

  test('should detect annotation conflicts', () => {
    const annotations = [
      { responseId: 'r1', codes: ['code1', 'code2'], themes: ['theme1'] },
      { responseId: 'r1', codes: ['code3', 'code4'], themes: ['theme2'] },
    ]
    const result = detectAnnotationConflicts(annotations)
    expect(result.conflicts.length).toBeGreaterThan(0)
  })

  test('should handle schema evolution', () => {
    const oldData = { id: 'r1', surveyId: 'survey-1' }
    const currentSchema = { version: '2.0', fields: ['id', 'surveyId', 'newField'] }
    const dataSchema = { version: '1.0', fields: ['id', 'surveyId'] }
    const result = handleSchemaEvolution(oldData, currentSchema, dataSchema)
    expect(result.compatible).toBe(true)
    expect(result.migrated).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('should ensure professional-grade reliability', () => {
    // All edge case handlers should return structured results
    const handlers = [
      () => handleSmallSample([], 'q1'),
      () => handleLargeDataset([]),
      () => detectContradictions({} as SurveyResponse, testSurvey),
      () => handleCorruptedImport([], { fields: [] }),
      () => handleMultilingualText(''),
      () => detectBiasedSampling([], testSurvey),
      () => detectAnnotationConflicts([]),
      () => handleSchemaEvolution({}, { version: '1.0', fields: [] }, { version: '1.0', fields: [] }),
    ]
    handlers.forEach(handler => {
      expect(() => handler()).not.toThrow()
      const result = handler()
      expect(result).toBeDefined()
    })
  })
})
