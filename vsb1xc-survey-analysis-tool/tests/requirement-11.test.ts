/**
 * Requirement 11: Response Metrics
 */
import {
  computeCompletionRate,
  identifyDropoutPoints,
  computeAverageResponseTime,
  computeItemNonResponseRates,
  computeEngagementCurve,
  analyzeCompletionFlow,
} from '@/lib/utils/responseMetrics'
import { SurveyResponse, Survey } from '@/lib/schemas/survey'

describe('Requirement 11: Response Metrics', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Q1', type: 'text', required: true, order: 1 },
      { id: 'q2', title: 'Q2', type: 'text', required: true, order: 2 },
      { id: 'q3', title: 'Q3', type: 'text', required: false, order: 3 },
    ],
  }

  test('should compute completion rates', () => {
    const responses: SurveyResponse[] = [
      { id: 'r1', surveyId: 'survey-1', submittedAt: new Date().toISOString(), completed: true, responses: [] },
      { id: 'r2', surveyId: 'survey-1', submittedAt: new Date().toISOString(), completed: false, responses: [] },
    ]
    const rate = computeCompletionRate(responses)
    expect(rate).toBe(0.5)
  })

  test('should identify dropout points', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: false,
        responses: [
          { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'Answer', timestamp: new Date().toISOString() },
          // Missing q2 and q3
        ],
      },
    ]
    const dropouts = identifyDropoutPoints(responses, testSurvey)
    expect(dropouts.size).toBeGreaterThan(0)
  })

  test('should compute average response time per question', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [
          {
            id: 'r1-q1',
            surveyId: 'survey-1',
            questionId: 'q1',
            value: 'Answer',
            timestamp: new Date().toISOString(),
            metadata: { responseTime: 5000 },
          },
        ],
      },
    ]
    const avgTime = computeAverageResponseTime(responses, 'q1')
    expect(avgTime).toBe(5000)
  })

  test('should compute item non-response rates', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [
          { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'Answer', timestamp: new Date().toISOString() },
          { id: 'r1-q2', surveyId: 'survey-1', questionId: 'q2', value: null, timestamp: new Date().toISOString() },
        ],
      },
    ]
    const rates = computeItemNonResponseRates(responses, testSurvey)
    expect(rates.get('q2')?.nonResponseRate).toBe(1)
  })

  test('should compute engagement curves', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [
          { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'Answer', timestamp: new Date().toISOString() },
          { id: 'r1-q2', surveyId: 'survey-1', questionId: 'q2', value: 'Answer', timestamp: new Date().toISOString() },
        ],
      },
    ]
    const curve = computeEngagementCurve(responses, testSurvey)
    expect(curve.length).toBe(3)
    expect(curve[0].responseRate).toBeGreaterThan(0)
  })

  test('should account for partial submissions', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: false,
        responses: [
          { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'Answer', timestamp: new Date().toISOString() },
        ],
      },
    ]
    const flow = analyzeCompletionFlow(responses, testSurvey)
    expect(flow.partialSubmissions.length).toBe(1)
  })

  test('should identify irregular completion flows', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: false,
        responses: [
          { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'Answer', timestamp: new Date().toISOString() },
          { id: 'r1-q3', surveyId: 'survey-1', questionId: 'q3', value: 'Answer', timestamp: new Date().toISOString() },
          // Skipped q2
        ],
      },
    ]
    const flow = analyzeCompletionFlow(responses, testSurvey)
    expect(flow.irregularFlows.length).toBeGreaterThan(0)
  })
})
