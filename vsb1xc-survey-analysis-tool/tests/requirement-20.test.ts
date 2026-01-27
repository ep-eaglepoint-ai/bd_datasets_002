/**
 * Requirement 20: Export Functionality
 */
import {
  exportResponsesToCSV,
  exportResponsesToJSON,
  exportSegmentToCSV,
  exportAnalyticalSummary,
  exportResearchNotes,
  generateComprehensiveReport,
} from '@/lib/utils/export'
import { Survey, SurveyResponse } from '@/lib/schemas/survey'
import { StatisticalSummary, Segment, ResearchInsight } from '@/lib/schemas/analytics'

describe('Requirement 20: Export', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test Survey',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Q1', type: 'numeric', required: false, order: 1 },
    ],
  }

  const responses: SurveyResponse[] = [
    {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: '2024-01-01T00:00:00.000Z',
      completed: true,
      responses: [
        { id: 'r1-q1', surveyId: 'survey-1', questionId: 'q1', value: 3.1415926535, timestamp: new Date().toISOString() },
      ],
    },
  ]

  test('should export cleaned datasets to CSV with precision', () => {
    const csv = exportResponsesToCSV(responses, testSurvey, { precision: 10 })
    expect(csv).toContain('3.1415926535')
    expect(csv).toContain('resp1')
    expect(csv).toContain('2024-01-01T00:00:00.000Z')
  })

  test('should export to JSON with schema integrity', () => {
    const json = exportResponsesToJSON(responses, { includeSchema: true, precision: 10 })
    const parsed = JSON.parse(json)
    expect(parsed.schema).toBeDefined()
    expect(parsed.data).toBeDefined()
    expect(parsed.data[0].id).toBe('resp1')
  })

  test('should export segmented subsets', () => {
    const segment: Segment = {
      id: 'seg1',
      surveyId: 'survey-1',
      name: 'Test Segment',
      description: 'Test',
      filter: { questionId: 'q1', operator: 'equals', value: 3.1415926535 },
      responseIds: ['resp1'],
      createdAt: new Date().toISOString(),
    }
    const csv = exportSegmentToCSV(responses, testSurvey, segment)
    expect(csv).toContain('resp1')
  })

  test('should export analytical summaries', () => {
    const summaries = new Map<string, StatisticalSummary>([
      [
        'q1',
        {
          count: 1,
          missing: 0,
          mean: 3.1415926535,
          median: 3.1415926535,
          mode: null,
          stdDev: 0,
          variance: 0,
          min: 3.1415926535,
          max: 3.1415926535,
        },
      ],
    ])
    const csv = exportAnalyticalSummary(summaries, testSurvey, 'csv')
    expect(csv).toContain('3.1415926535')
  })

  test('should export research notes', () => {
    const insights: ResearchInsight[] = [
      {
        id: 'insight1',
        surveyId: 'survey-1',
        title: 'Test Insight',
        content: 'Test content',
        type: 'note',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ]
    const markdown = exportResearchNotes(insights, 'markdown')
    expect(markdown).toContain('Test Insight')
    expect(markdown).toContain('2024-01-01T00:00:00.000Z')
  })

  test('should generate comprehensive reports with traceability', () => {
    const summaries = new Map<string, StatisticalSummary>([
      [
        'q1',
        {
          count: 1,
          missing: 0,
          mean: 3.1415926535,
          median: 3.1415926535,
          mode: null,
          stdDev: 0,
          variance: 0,
          min: 3.1415926535,
          max: 3.1415926535,
        },
      ],
    ])
    const report = generateComprehensiveReport(testSurvey, responses, summaries)
    expect(report).toContain('Test Survey')
    expect(report).toContain('3.1415926535')
    expect(report).toContain('traceability')
  })

  test('should preserve numeric precision', () => {
    const csv = exportResponsesToCSV(responses, testSurvey, { precision: 10 })
    // Should contain full precision
    expect(csv).toContain('3.1415926535')
  })

  test('should preserve timestamp accuracy', () => {
    const csv = exportResponsesToCSV(responses, testSurvey, { includeTimestamps: true })
    expect(csv).toContain('2024-01-01T00:00:00.000Z')
  })
})
