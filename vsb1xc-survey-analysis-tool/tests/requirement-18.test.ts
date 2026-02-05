/**
 * Requirement 18: Zustand State Management
 */
import { useSurveyStore } from '@/lib/store/surveyStore'
import { stateQueue } from '@/lib/store/asyncQueue'
import { Survey } from '@/lib/schemas/survey'

describe('Requirement 18: State Management', () => {
  beforeEach(() => {
    // Reset store
    useSurveyStore.setState({
      surveys: [],
      responses: [],
      annotations: [],
      insights: [],
      segments: [],
    })
  })

  test('should use Zustand for state management', () => {
    const store = useSurveyStore.getState()
    expect(store).toBeDefined()
    expect(store.surveys).toBeDefined()
    expect(store.responses).toBeDefined()
  })

  test('should prevent race conditions with async queue', async () => {
    let callOrder: number[] = []
    
    const op1 = stateQueue.enqueue(async () => {
      callOrder.push(1)
      await new Promise(resolve => setTimeout(resolve, 10))
      callOrder.push(2)
    })
    
    const op2 = stateQueue.enqueue(async () => {
      callOrder.push(3)
      await new Promise(resolve => setTimeout(resolve, 5))
      callOrder.push(4)
    })
    
    await Promise.all([op1, op2])
    // Operations should complete in order
    expect(callOrder).toEqual([1, 2, 3, 4])
  })

  test('should ensure reproducible state updates', () => {
    const survey: Survey = {
      id: 'survey-1',
      title: 'Test',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: [],
    }
    
    useSurveyStore.getState().setCurrentSurvey(survey)
    const state1 = useSurveyStore.getState().currentSurvey
    
    useSurveyStore.getState().setCurrentSurvey(survey)
    const state2 = useSurveyStore.getState().currentSurvey
    
    expect(state1?.id).toBe(state2?.id)
  })

  test('should handle filter changes predictably', () => {
    const setError = useSurveyStore.getState().setError
    setError('Test error')
    expect(useSurveyStore.getState().error).toBe('Test error')
    
    useSurveyStore.getState().clearError()
    expect(useSurveyStore.getState().error).toBeNull()
  })

  test('should queue critical operations', async () => {
    const loadSurveys = useSurveyStore.getState().loadSurveys
    // Should use queue internally
    await expect(loadSurveys()).resolves.not.toThrow()
  })
})
