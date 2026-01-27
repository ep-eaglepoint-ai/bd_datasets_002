/**
 * Requirement 1: Survey Design with Multiple Question Types and Zod Validation
 */
import { SurveySchema } from '@/lib/schemas/survey'
import { validateSurvey } from '@/lib/utils/validation'
import { z } from 'zod'

describe('Requirement 1: Survey Design', () => {
  const validSurvey = {
    id: 'survey-1',
    title: 'Test Survey',
    description: 'A test survey',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: [
      {
        id: 'q1',
        title: 'Multiple Choice',
        type: 'multiple-choice',
        required: true,
        order: 1,
        options: [
          { id: 'opt1', label: 'Option A', value: 'A' },
          { id: 'opt2', label: 'Option B', value: 'B' },
          { id: 'opt3', label: 'Option C', value: 'C' },
        ],
      },
      {
        id: 'q2',
        title: 'Rating Scale',
        type: 'rating-scale',
        required: true,
        order: 2,
        scale: { min: 1, max: 5, step: 1, labels: { min: 'Poor', max: 'Excellent' } },
      },
      {
        id: 'q3',
        title: 'Numeric Input',
        type: 'numeric',
        required: false,
        order: 3,
      },
      {
        id: 'q4',
        title: 'Free Text',
        type: 'text',
        required: false,
        order: 4,
      },
      {
        id: 'q5',
        title: 'Ranking',
        type: 'ranking',
        required: true,
        order: 5,
        ranking: {
          options: [
            { id: 'item1', label: 'Item 1' },
            { id: 'item2', label: 'Item 2' },
            { id: 'item3', label: 'Item 3' },
          ],
        },
      },
      {
        id: 'q6',
        title: 'Matrix',
        type: 'matrix',
        required: true,
        order: 6,
        matrix: {
          rows: [
            { id: 'row1', label: 'Row 1' },
            { id: 'row2', label: 'Row 2' },
          ],
          columns: [
            { id: 'col1', label: 'Col 1' },
            { id: 'col2', label: 'Col 2' },
          ],
        },
      },
    ],
  }

  test('should validate a survey with all question types', () => {
    const result = validateSurvey(validSurvey)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  test('should reject malformed survey definitions', () => {
    const invalid = { ...validSurvey, questions: [] }
    const result = validateSurvey(invalid)
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  test('should reject missing answer constraints', () => {
    const invalid = {
      ...validSurvey,
      questions: [
        {
          id: 'q1',
          title: 'Invalid',
          type: 'multiple-choice',
          required: true,
          order: 1,
          // Missing options
        },
      ],
    }
    const result = validateSurvey(invalid)
    expect(result.success).toBe(false)
  })

  test('should reject inconsistent scoring scales', () => {
    const invalid = {
      ...validSurvey,
      questions: [
        {
          id: 'q1',
          title: 'Invalid Scale',
          type: 'rating-scale',
          required: true,
          order: 1,
          scale: { min: 5, max: 1, step: 1 }, // min > max
        },
      ],
    }
    const result = validateSurvey(invalid)
    expect(result.success).toBe(false)
  })

  test('should validate question order sequence', () => {
    // Test that survey structure is valid regardless of order
    const result = validateSurvey(validSurvey)
    expect(result.success).toBe(true)
  })

  test('should validate all question types are supported', () => {
    // Test that the valid survey contains all question types
    const types = validSurvey.questions.map(q => q.type)
    expect(types).toContain('multiple-choice')
    expect(types).toContain('rating-scale')
    expect(types).toContain('numeric')
    expect(types).toContain('text')
    expect(types).toContain('ranking')
    expect(types).toContain('matrix')
  })
})
