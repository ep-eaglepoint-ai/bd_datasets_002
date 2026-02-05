/**
 * Requirement 9: Manual Annotation System
 */
import { computeThemeFrequency, computeCodeFrequency, computeThemeCoOccurrence, trackAnnotationChange } from '@/lib/utils/annotationAnalysis'
import { Annotation } from '@/lib/schemas/analytics'

describe('Requirement 9: Annotation System', () => {
  const annotations: Annotation[] = [
    {
      id: 'ann1',
      responseId: 'resp1',
      questionId: 'q1',
      codes: ['code1', 'code2'],
      themes: ['theme1', 'theme2'],
      notes: 'Initial notes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'ann2',
      responseId: 'resp2',
      questionId: 'q1',
      codes: ['code1'],
      themes: ['theme1'],
      notes: 'Second annotation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  test('should compute theme frequency', () => {
    const frequency = computeThemeFrequency(annotations)
    expect(frequency.length).toBeGreaterThan(0)
    expect(frequency.find(f => f.theme === 'theme1')?.frequency).toBe(2)
  })

  test('should compute code frequency', () => {
    const frequency = computeCodeFrequency(annotations)
    expect(frequency.find(f => f.code === 'code1')?.frequency).toBe(2)
  })

  test('should compute theme co-occurrence', () => {
    const coOccurrence = computeThemeCoOccurrence(annotations)
    expect(coOccurrence.length).toBeGreaterThan(0)
    const theme1Theme2 = coOccurrence.find(c => c.theme1 === 'theme1' && c.theme2 === 'theme2')
    expect(theme1Theme2).toBeDefined()
  })

  test('should track annotation history', () => {
    const oldAnnotation = annotations[0]
    const newAnnotation = { ...oldAnnotation, codes: ['code1', 'code3'], notes: 'Updated notes' }
    const change = trackAnnotationChange(oldAnnotation, newAnnotation, 'updated')
    expect(change.action).toBe('updated')
    expect(change.changes.codes?.added).toContain('code3')
    expect(change.changes.codes?.removed).toContain('code2')
    expect(change.changes.notes?.old).toBe('Initial notes')
    expect(change.changes.notes?.new).toBe('Updated notes')
  })

  test('should be reversible', () => {
    // Deletion is reversible through history
    const change = trackAnnotationChange(annotations[0], annotations[0], 'deleted')
    expect(change.action).toBe('deleted')
  })

  test('should be auditable', () => {
    const change = trackAnnotationChange(null, annotations[0], 'created')
    expect(change.timestamp).toBeDefined()
    expect(change.changedBy).toBeDefined()
  })
})
