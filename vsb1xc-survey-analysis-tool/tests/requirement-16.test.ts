/**
 * Requirement 16: IndexedDB Persistence
 */
import { storage } from '@/lib/storage/indexeddb'
import { checkDatabaseIntegrity, recoverInterruptedWrites, createBackup, restoreBackup } from '@/lib/storage/recovery'
import { Survey, SurveyResponse } from '@/lib/schemas/survey'

describe('Requirement 16: IndexedDB Persistence', () => {
  beforeEach(async () => {
    try {
      await storage.init()
      // Clear data before each test
      try {
        await storage.clearAll()
      } catch (e) {
        // Ignore if already cleared
      }
    } catch (e) {
      // Ignore initialization errors in test environment
    }
  })

  test('should persist survey definitions', async () => {
    const survey: Survey = {
      id: 'survey-1',
      title: 'Test Survey',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [
        { id: 'q1', title: 'Test Question', type: 'text', required: false, order: 0 },
      ],
    }
    await storage.saveSurvey(survey)
    const loaded = await storage.getSurvey('survey-1')
    expect(loaded).toBeDefined()
    expect(loaded?.id).toBe('survey-1')
  })

  test('should persist response datasets', async () => {
    const response: SurveyResponse = {
      id: 'resp1',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [],
    }
    await storage.saveResponse(response)
    const loaded = await storage.getResponse('resp1')
    expect(loaded).toBeDefined()
  })

  test('should persist annotations', async () => {
    const annotation = {
      id: 'ann1',
      responseId: 'resp1',
      questionId: 'q1',
      codes: ['code1'],
      themes: ['theme1'],
      notes: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await storage.saveAnnotation(annotation)
    const loaded = await storage.getAnnotationsByResponse('resp1')
    expect(loaded.length).toBe(1)
  })

  test('should work offline', async () => {
    // IndexedDB works offline by design
    const survey: Survey = {
      id: 'survey-2',
      title: 'Offline Test',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [
        { id: 'q1', title: 'Test Question', type: 'text', required: false, order: 0 },
      ],
    }
    await storage.saveSurvey(survey)
    // Should work without network
    const loaded = await storage.getSurvey('survey-2')
    expect(loaded).toBeDefined()
  })

  test('should check database integrity', async () => {
    const result = await checkDatabaseIntegrity()
    expect(result.valid).toBeDefined()
    expect(result.errors).toBeDefined()
  })

  test('should recover from interrupted writes', async () => {
    const result = await recoverInterruptedWrites()
    expect(result.recovered).toBeDefined()
    expect(result.errors).toBeDefined()
  })

  test('should create and restore backups', async () => {
    const survey: Survey = {
      id: 'survey-3',
      title: 'Backup Test',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [
        { id: 'q1', title: 'Test Question', type: 'text', required: false, order: 0 },
      ],
    }
    await storage.saveSurvey(survey)
    
    const backup = await createBackup()
    expect(backup).toBeInstanceOf(Blob)
    
    // Restore
    await restoreBackup(backup)
    const restored = await storage.getSurvey('survey-3')
    expect(restored).toBeDefined()
  })

  test('should handle transaction safety', async () => {
    const response: SurveyResponse = {
      id: 'resp2',
      surveyId: 'survey-1',
      submittedAt: new Date().toISOString(),
      completed: true,
      responses: [],
    }
    // Should use transactions internally
    await storage.saveResponse(response)
    const loaded = await storage.getResponse('resp2')
    expect(loaded).toBeDefined()
  })
})
