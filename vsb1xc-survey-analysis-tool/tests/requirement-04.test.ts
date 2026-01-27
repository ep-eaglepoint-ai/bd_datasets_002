/**
 * Requirement 4: Data Type Inference with Override
 */
import { inferDataType, normalizeValue } from '@/lib/utils/dataProcessing'
import { inferDataTypes, coerceTypes } from '@/lib/utils/dataCleaning'
import { SurveyResponse } from '@/lib/schemas/survey'

describe('Requirement 4: Data Type Inference', () => {
  const createResponse = (id: string, values: Record<string, unknown>): SurveyResponse => ({
    id,
    surveyId: 'survey-1',
    submittedAt: new Date().toISOString(),
    completed: true,
    responses: Object.entries(values).map(([questionId, value]) => ({
      id: `${id}-${questionId}`,
      surveyId: 'survey-1',
      questionId,
      value,
      timestamp: new Date().toISOString(),
    })),
  })

  test('should infer numeric type', () => {
    expect(inferDataType(42)).toBe('numeric')
    expect(inferDataType('42')).toBe('numeric')
    expect(inferDataType('42.5')).toBe('numeric')
  })

  test('should infer categorical type', () => {
    expect(inferDataType(['A', 'B', 'C'])).toBe('categorical')
  })

  test('should infer boolean type', () => {
    expect(inferDataType(true)).toBe('boolean')
    expect(inferDataType('true')).toBe('boolean')
    expect(inferDataType('yes')).toBe('boolean')
  })

  test('should infer text type', () => {
    expect(inferDataType('Hello World')).toBe('text')
  })

  test('should infer ordinal type for rating scales', () => {
    const question = { id: 'q1', title: 'Q1', type: 'rating-scale' as const, required: false, order: 1 }
    expect(inferDataType(3, question)).toBe('ordinal')
  })

  test('should tolerate malformed numeric entries', () => {
    expect(inferDataType('not a number')).toBe('text')
    expect(inferDataType('42abc')).toBe('text')
    expect(inferDataType(NaN)).toBe('mixed')
  })

  test('should handle invalid dates', () => {
    expect(inferDataType('invalid date')).toBe('text')
    expect(inferDataType('2024-13-45')).toBe('text')
  })

  test('should handle sparse responses', () => {
    expect(inferDataType(null)).toBe('mixed')
    expect(inferDataType(undefined)).toBe('mixed')
    expect(inferDataType('')).toBe('mixed')
  })

  test('should detect mixed types', () => {
    const responses = [
      createResponse('resp1', { q1: 42 }),
      createResponse('resp2', { q1: 'Answer' }),
      createResponse('resp3', { q1: true }),
    ]
    const inference = inferDataTypes(responses, 'q1')
    expect(inference.mixedTypes).toBe(true)
  })

  test('should allow type override with safe re-coercion', () => {
    const responses = [createResponse('resp1', { q1: '42' })]
    const coerced = coerceTypes(responses, 'q1', 'numeric', { strict: false })
    expect(typeof coerced[0].responses[0].value).toBe('number')
    expect(coerced[0].responses[0].value).toBe(42)
  })

  test('should handle contradictory formatting', () => {
    const responses = [
      createResponse('resp1', { q1: '42' }),
      createResponse('resp2', { q1: 'not a number' }),
    ]
    const inference = inferDataTypes(responses, 'q1')
    expect(inference.mixedTypes).toBe(true)
    expect(inference.confidence).toBeLessThan(1)
  })

  test('should provide confidence scores', () => {
    const responses = [
      createResponse('resp1', { q1: 1 }),
      createResponse('resp2', { q1: 2 }),
      createResponse('resp3', { q1: 3 }),
    ]
    const inference = inferDataTypes(responses, 'q1')
    expect(inference.confidence).toBeGreaterThan(0.8)
  })

  test('should handle strict vs non-strict coercion', () => {
    const responses = [createResponse('resp1', { q1: 'not a number' })]
    
    const strict = coerceTypes(responses, 'q1', 'numeric', { strict: true })
    expect(strict[0].responses[0].value).toBeNull()
    
    const nonStrict = coerceTypes(responses, 'q1', 'numeric', { strict: false })
    expect(nonStrict[0].responses[0].value).toBe('not a number')
  })
})
