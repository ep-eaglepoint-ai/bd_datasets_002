/**
 * Requirement 13: Fast, Deterministic Filtering
 */
import { filterResponses, createFilterIndex, filterResponsesWithIndex } from '@/lib/utils/filtering'
import { SurveyResponse, Survey } from '@/lib/schemas/survey'

describe('Requirement 13: Filtering', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Age', type: 'numeric', required: false, order: 1 },
      { id: 'q2', title: 'Gender', type: 'multiple-choice', required: false, order: 2, options: ['Male', 'Female'] },
    ],
  }

  const responses: SurveyResponse[] = [
    {
      id: 'r1',
      surveyId: 'survey-1',
      submittedAt: '2024-01-01T00:00:00Z',
      completed: true,
      responses: [
        { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 25, timestamp: new Date().toISOString() },
        { id: 'r1-q2', surveyId: 'survey-1', questionId: 'q2', value: 'Male', timestamp: new Date().toISOString() },
      ],
    },
    {
      id: 'r2',
      surveyId: 'survey-1',
      submittedAt: '2024-01-02T00:00:00Z',
      completed: false,
      responses: [
        { id: 'r2-q1', surveyId: 'survey-1', questionId: 'q1', value: 30, timestamp: new Date().toISOString() },
        { id: 'r2-q2', surveyId: 'survey-1', questionId: 'q2', value: 'Female', timestamp: new Date().toISOString() },
      ],
    },
  ]

  test('should filter by demographic variables', () => {
    const filter = {
      groups: [
        {
          conditions: [{ field: 'question' as const, questionId: 'q2', operator: 'equals' as const, value: 'Male' }],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponses(responses, testSurvey, filter)
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('r1')
  })

  test('should filter by answer values', () => {
    const filter = {
      groups: [
        {
          conditions: [{ field: 'question' as const, questionId: 'q1', operator: 'greater-than' as const, value: 25 }],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponses(responses, testSurvey, filter)
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('r2')
  })

  test('should filter by timestamps', () => {
    const filter = {
      groups: [
        {
          conditions: [
            { field: 'timestamp' as const, operator: 'greater-than' as const, value: '2024-01-01T12:00:00Z' },
          ],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponses(responses, testSurvey, filter)
    expect(filtered.length).toBe(1)
  })

  test('should filter by completion status', () => {
    const filter = {
      groups: [
        {
          conditions: [{ field: 'completion' as const, operator: 'equals' as const, value: true }],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponses(responses, testSurvey, filter)
    expect(filtered.length).toBe(1)
    expect(filtered[0].completed).toBe(true)
  })

  test('should filter by bias flags', () => {
    const filter = {
      groups: [
        {
          conditions: [{ field: 'bias-flag' as const, operator: 'equals' as const, value: 'straight-lining' }],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponses(responses, testSurvey, filter, {
      biasFlags: new Map([['r1', { flags: ['straight-lining'], score: 0.7, straightLining: true, randomAnswering: false, duplicateSubmission: false, extremeResponseBias: false, inconsistentAnswers: false, unusuallyFast: false }]]),
    })
    expect(filtered.length).toBe(1)
  })

  test('should support chained query conditions', () => {
    const filter = {
      groups: [
        {
          conditions: [
            { field: 'question' as const, questionId: 'q1', operator: 'greater-than' as const, value: 20 },
            { field: 'question' as const, questionId: 'q2', operator: 'equals' as const, value: 'Male' },
          ],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponses(responses, testSurvey, filter)
    expect(filtered.length).toBe(1)
  })

  test('should be fast with indexed filtering', () => {
    const index = createFilterIndex(responses, testSurvey)
    const filter = {
      groups: [
        {
          conditions: [{ field: 'question' as const, questionId: 'q2', operator: 'equals' as const, value: 'Male' }],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const filtered = filterResponsesWithIndex(responses, testSurvey, filter, index)
    expect(filtered.length).toBe(1)
  })

  test('should be deterministic', () => {
    const filter = {
      groups: [
        {
          conditions: [{ field: 'question' as const, questionId: 'q2', operator: 'equals' as const, value: 'Male' }],
          logic: 'AND' as const,
        },
      ],
      groupLogic: 'AND' as const,
    }
    const result1 = filterResponses(responses, testSurvey, filter)
    const result2 = filterResponses(responses, testSurvey, filter)
    expect(result1.length).toBe(result2.length)
    expect(result1[0].id).toBe(result2[0].id)
  })
})
