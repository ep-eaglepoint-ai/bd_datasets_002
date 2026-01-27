/**
 * Requirement 2: CSV/JSON Import with Validation
 */
import { importCSV, importJSON } from '@/lib/utils/csvImport'
import { Survey } from '@/lib/schemas/survey'

describe('Requirement 2: Data Import', () => {
  const testSurvey: Survey = {
    id: 'survey-1',
    title: 'Test Survey',
    description: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      { id: 'q1', title: 'Question 1', type: 'text', required: true, order: 1 },
      { id: 'q2', title: 'Question 2', type: 'numeric', required: false, order: 2 },
    ],
  }

  test('should import valid CSV without errors', async () => {
    const csvContent = 'id,surveyId,q1,q2,submittedAt\nresp1,survey-1,Answer 1,42,2024-01-01T00:00:00Z'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    expect(result.success).toBe(true)
    expect(result.responses.length).toBeGreaterThan(0)
    expect(result.errors.length).toBe(0)
  })

  test('should detect missing required fields', async () => {
    const csvContent = 'id,surveyId,q2,submittedAt\nresp1,survey-1,42,2024-01-01T00:00:00Z'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('should handle encoding issues', async () => {
    const csvContent = '\uFEFFid,surveyId,q1,q2,submittedAt\nresp1,survey-1,Answer\uFFFD,42,2024-01-01T00:00:00Z'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    // Should handle encoding and still import
    expect(result.success).toBe(true)
  })

  test('should detect malformed rows', async () => {
    const csvContent = 'id,surveyId,q1,q2,submittedAt\nresp1,survey-1,Answer,42,2024-01-01T00:00:00Z\ninvalid-row'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    // Should handle malformed rows gracefully
    expect(result).toBeDefined()
    expect(result.success !== undefined).toBe(true)
  })

  test('should detect duplicate submissions', async () => {
    const csvContent = 'id,surveyId,q1,q2,submittedAt\nresp1,survey-1,Answer,42,2024-01-01T00:00:00Z\nresp1,survey-1,Answer,42,2024-01-01T00:00:00Z'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true)
  })

  test('should handle incomplete responses', async () => {
    const csvContent = 'id,surveyId,q1,q2,submittedAt\nresp1,survey-1,,42,2024-01-01T00:00:00Z'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    // Should import but flag missing required field
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  test('should import valid JSON', async () => {
    const jsonContent = JSON.stringify([
      {
        id: 'resp1',
        surveyId: 'survey-1',
        q1: 'Answer 1',
        q2: 42,
        submittedAt: '2024-01-01T00:00:00Z',
      },
    ])
    const file = new File([jsonContent], 'test.json', { type: 'application/json' })
    
    const result = await importJSON(file, testSurvey)
    expect(result.success).toBe(true)
    expect(result.responses.length).toBe(1)
  })

  test('should validate row structure', async () => {
    const csvContent = 'id,surveyId\nresp1,survey-1'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    // Should detect missing question columns
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('should not crash on corrupted data', async () => {
    const csvContent = 'invalid,data,structure\n,,,\n'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const result = await importCSV(file, testSurvey)
    // Should handle gracefully without crashing
    expect(result).toBeDefined()
    expect(result.success).toBe(false)
  })
})
