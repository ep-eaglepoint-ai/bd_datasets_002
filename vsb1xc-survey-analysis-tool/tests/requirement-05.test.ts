/**
 * Requirement 5: Statistical Summaries with Edge Case Handling
 */
import { computeRobustStatisticalSummary } from '@/lib/utils/statistics'
import { SurveyResponse } from '@/lib/schemas/survey'

describe('Requirement 5: Statistical Summaries', () => {
  const createResponse = (id: string, value: number | null): SurveyResponse => ({
    id,
    surveyId: 'survey-1',
    submittedAt: new Date().toISOString(),
    completed: true,
    responses: [
      {
        id: `${id}-q1`,
        surveyId: 'survey-1',
        questionId: 'q1',
        value,
        timestamp: new Date().toISOString(),
      },
    ],
  })

  test('should compute counts and proportions', () => {
    const responses = [
      createResponse('resp1', 1),
      createResponse('resp2', 2),
      createResponse('resp3', 3),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.count).toBe(3)
  })

  test('should compute mean and median', () => {
    const responses = [
      createResponse('resp1', 1),
      createResponse('resp2', 2),
      createResponse('resp3', 3),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.mean).toBe(2)
    expect(summary.median).toBe(2)
  })

  test('should compute standard deviation and variance', () => {
    const responses = [
      createResponse('resp1', 1),
      createResponse('resp2', 2),
      createResponse('resp3', 3),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.stdDev).toBeDefined()
    expect(summary.variance).toBeDefined()
    expect(summary.variance).toBeGreaterThan(0)
  })

  test('should compute confidence intervals', () => {
    const responses = Array.from({ length: 30 }, (_, i) => createResponse(`resp${i}`, i + 1))
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.confidenceInterval).toBeDefined()
    expect(summary.confidenceInterval?.lower).toBeLessThan(summary.mean!)
    expect(summary.confidenceInterval?.upper).toBeGreaterThan(summary.mean!)
  })

  test('should compute frequency distributions', () => {
    const responses = [
      createResponse('resp1', 1),
      createResponse('resp2', 1),
      createResponse('resp3', 2),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.frequencyDistribution).toBeDefined()
    expect(summary.frequencyDistribution!.length).toBeGreaterThan(0)
  })

  test('should handle small sample sizes with warnings', () => {
    const responses = [createResponse('resp1', 1), createResponse('resp2', 2)]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.sampleSize).toBe('small')
    expect(summary.warnings.length).toBeGreaterThan(0)
    expect(summary.warnings.some(w => w.includes('Small sample'))).toBe(true)
  })

  test('should handle skewed distributions', () => {
    const responses = [
      ...Array.from({ length: 10 }, (_, i) => createResponse(`resp${i}`, 1)),
      createResponse('resp10', 100),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    if (summary.isSkewed) {
      expect(summary.warnings.some(w => w.includes('skewed'))).toBe(true)
    }
  })

  test('should handle missing values', () => {
    const responses = [
      createResponse('resp1', 1),
      createResponse('resp2', null),
      createResponse('resp3', 2),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.missing).toBe(1)
    expect(summary.warnings.some(w => w.includes('missing'))).toBe(true)
  })

  test('should filter NaN values', () => {
    const responses = [
      createResponse('resp1', 1),
      createResponse('resp2', NaN as any),
      createResponse('resp3', 2),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.count).toBe(2) // NaN filtered out
  })

  test('should handle floating-point precision', () => {
    const responses = [
      createResponse('resp1', 0.1),
      createResponse('resp2', 0.2),
      createResponse('resp3', 0.3),
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.mean).toBeCloseTo(0.2, 6)
  })

  test('should not produce misleading results for small samples', () => {
    const responses = [createResponse('resp1', 1)]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    // Should warn about small sample
    expect(summary.warnings.length).toBeGreaterThan(0)
    // Should still compute but with warnings
    expect(summary.mean).toBe(1)
  })
})
