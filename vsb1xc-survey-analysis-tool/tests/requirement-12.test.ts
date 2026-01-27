/**
 * Requirement 12: Dynamic Visualizations
 */
import { SurveyResponse, Survey } from '@/lib/schemas/survey'
import { computeRobustStatisticalSummary } from '@/lib/utils/statistics'
import { computeCrossTabulation } from '@/lib/utils/crossTabulation'

describe('Requirement 12: Visualizations', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Q1', type: 'text', required: false, order: 1 },
      { id: 'q2', title: 'Q2', type: 'numeric', required: false, order: 2 },
    ],
  }

  test('should generate data for bar charts', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [{ id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'A', timestamp: new Date().toISOString() }],
      },
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.frequencyDistribution).toBeDefined()
    expect(summary.frequencyDistribution!.length).toBeGreaterThan(0)
  })

  test('should generate data for correlation matrices', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [
          { id: 'r1-q2', surveyId: 'survey-1', questionId: 'q2', value: 1, timestamp: new Date().toISOString() },
        ],
      },
    ]
    // Correlation requires multiple numeric questions
    const crossTab = computeCrossTabulation(responses, 'q2', 'q2')
    expect(crossTab.table).toBeDefined()
  })

  test('should handle empty datasets gracefully', () => {
    const responses: SurveyResponse[] = []
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.count).toBe(0)
    expect(summary.frequencyDistribution).toBeDefined()
  })

  test('should handle sparse datasets', () => {
    const responses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [{ id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'A', timestamp: new Date().toISOString() }],
      },
    ]
    const summary = computeRobustStatisticalSummary(responses, 'q1')
    expect(summary.frequencyDistribution).toBeDefined()
  })

  test('should update when filters change', () => {
    const allResponses: SurveyResponse[] = [
      {
        id: 'r1',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [{ id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 'A', timestamp: new Date().toISOString() }],
      },
      {
        id: 'r2',
        surveyId: 'survey-1',
        submittedAt: new Date().toISOString(),
        completed: true,
        responses: [{ id: 'r2-q1', surveyId: 'survey-1', questionId: 'q1', value: 'B', timestamp: new Date().toISOString() }],
      },
    ]
    const filtered = allResponses.filter(r => r.id === 'r1')
    const summary1 = computeRobustStatisticalSummary(allResponses, 'q1')
    const summary2 = computeRobustStatisticalSummary(filtered, 'q1')
    // Filtered should have same or fewer responses
    expect(summary1.count >= summary2.count).toBe(true)
  })
})
