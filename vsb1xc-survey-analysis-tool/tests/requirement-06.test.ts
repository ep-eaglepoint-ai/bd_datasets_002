/**
 * Requirement 6: Segmentation and Cross-Tabulation
 */
import { createSegment, compareSegments, validateSegmentComparison } from '@/lib/utils/segmentation'
import { computeCrossTabulation } from '@/lib/utils/crossTabulation'
import { SurveyResponse, Survey } from '@/lib/schemas/survey'

describe('Requirement 6: Segmentation', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Age', type: 'numeric', required: false, order: 1 },
      { id: 'q2', title: 'Gender', type: 'multiple-choice', required: false, order: 2, options: ['Male', 'Female'] },
      { id: 'q3', title: 'Satisfaction', type: 'rating-scale', required: false, order: 3, scale: { min: 1, max: 5, step: 1 } },
    ],
  }

  const createResponse = (id: string, age: number, gender: string, satisfaction: number): SurveyResponse => ({
    id,
    surveyId: 'survey-1',
    submittedAt: new Date().toISOString(),
    completed: true,
    responses: [
      { id: `${id}-q1`, surveyId: 'survey-1', questionId: 'q1', value: age, timestamp: new Date().toISOString() },
      { id: `${id}-q2`, surveyId: 'survey-1', questionId: 'q2', value: gender, timestamp: new Date().toISOString() },
      { id: `${id}-q3`, surveyId: 'survey-1', questionId: 'q3', value: satisfaction, timestamp: new Date().toISOString() },
    ],
  })

  const responses: SurveyResponse[] = [
    createResponse('resp1', 25, 'Male', 4),
    createResponse('resp2', 30, 'Female', 5),
    createResponse('resp3', 25, 'Male', 3),
    createResponse('resp4', 35, 'Female', 4),
  ]

  test('should create segment by demographic variable', () => {
    const segment = createSegment(responses, testSurvey, 'Male Respondents', {
      questionId: 'q2',
      operator: 'equals',
      value: 'Male',
    })
    expect(segment.responseIds.length).toBe(2)
    expect(segment.name).toBe('Male Respondents')
  })

  test('should compute cross-tabulated results', () => {
    const crossTab = computeCrossTabulation(responses, 'q2', 'q3')
    expect(crossTab.table.length).toBeGreaterThan(0)
    expect(crossTab.rowLabels.length).toBeGreaterThan(0)
    expect(crossTab.columnLabels.length).toBeGreaterThan(0)
  })

  test('should compute comparative distributions', () => {
    const segment1 = createSegment(responses, testSurvey, 'Male', {
      questionId: 'q2',
      operator: 'equals',
      value: 'Male',
    })
    const segment2 = createSegment(responses, testSurvey, 'Female', {
      questionId: 'q2',
      operator: 'equals',
      value: 'Female',
    })
    
    const comparison = compareSegments([segment1, segment2], responses, testSurvey, 'q3')
    expect(comparison.segments.length).toBe(2)
    expect(comparison.comparisons.length).toBeGreaterThan(0)
  })

  test('should ensure statistical validity', () => {
    const segment = createSegment(responses, testSurvey, 'Small Segment', {
      questionId: 'q2',
      operator: 'equals',
      value: 'Male',
    })
    const comparison = compareSegments([segment], responses, testSurvey, 'q3')
    const validation = validateSegmentComparison(comparison, 30)
    // Should warn about small sample
    expect(validation.warnings.length).toBeGreaterThan(0)
  })

  test('should handle correct normalization', () => {
    const crossTab = computeCrossTabulation(responses, 'q2', 'q3', { normalize: 'row' })
    expect(crossTab.normalizedTable).toBeDefined()
    // Row sums should be 1
    crossTab.normalizedTable!.forEach(row => {
      const sum = row.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 2)
    })
  })

  test('should handle sparse subgroups', () => {
    const sparseResponses = [
      createResponse('resp1', 25, 'Male', 4),
      createResponse('resp2', 30, 'Female', 5),
    ]
    const crossTab = computeCrossTabulation(sparseResponses, 'q2', 'q3', { minCellSize: 5 })
    expect(crossTab.warnings.some(w => w.includes('sparse') || w.includes('cell'))).toBe(true)
  })

  test('should handle imbalanced subgroups', () => {
    const imbalanced = [
      ...Array.from({ length: 10 }, (_, i) => createResponse(`resp${i}`, 25, 'Male', 4)),
      createResponse('resp10', 30, 'Female', 5),
    ]
    const comparison = compareSegments(
      [
        createSegment(imbalanced, testSurvey, 'Male', { questionId: 'q2', operator: 'equals', value: 'Male' }),
        createSegment(imbalanced, testSurvey, 'Female', { questionId: 'q2', operator: 'equals', value: 'Female' }),
      ],
      imbalanced,
      testSurvey,
      'q3'
    )
    const validation = validateSegmentComparison(comparison)
    expect(validation.warnings.some(w => w.includes('small') || w.includes('imbalanced'))).toBe(true)
  })
})
