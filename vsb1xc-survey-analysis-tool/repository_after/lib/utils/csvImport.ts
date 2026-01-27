import Papa from 'papaparse'
import { Survey, SurveyResponse } from '@/lib/schemas/survey'
import { validateSurveyResponse } from './validation'

export interface ImportResult {
  success: boolean
  responses: SurveyResponse[]
  errors: Array<{ row: number; message: string }>
  warnings: Array<{ row: number; message: string }>
}

export async function importCSV(file: File, survey: Survey): Promise<ImportResult> {
  return new Promise((resolve) => {
    const text = file.text()
    text.then((content) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        error: (error) => {
          resolve({
            success: false,
            responses: [],
            errors: [{ row: 0, message: `CSV parsing error: ${error.message}` }],
            warnings: [],
          })
        },
        complete: (results) => {
          const responses: SurveyResponse[] = []
          const errors: Array<{ row: number; message: string }> = []
          const warnings: Array<{ row: number; message: string }> = []
          const seenIds = new Set<string>()

          results.data.forEach((row: any, index: number) => {
            try {
              if (!row.id || !row.surveyId) {
                errors.push({ row: index + 1, message: 'Missing required fields' })
                return
              }

              if (seenIds.has(row.id)) {
                errors.push({ row: index + 1, message: 'Duplicate submission ID' })
                return
              }
              seenIds.add(row.id)

              // Check for missing required question columns
              const missingRequiredQuestions = survey.questions
                .filter(q => q.required && !(q.id in row))
                .map(q => q.id)
              
              if (missingRequiredQuestions.length > 0) {
                errors.push({ 
                  row: index + 1, 
                  message: `Missing required question columns: ${missingRequiredQuestions.join(', ')}` 
                })
                return
              }

              // Check for missing required values
              const missingRequiredValues = survey.questions
                .filter(q => q.required && (!row[q.id] || row[q.id] === ''))
                .map(q => q.id)
              
              if (missingRequiredValues.length > 0) {
                warnings.push({
                  row: index + 1,
                  message: `Missing required values for questions: ${missingRequiredValues.join(', ')}`
                })
              }

              const response: SurveyResponse = {
                id: row.id,
                surveyId: row.surveyId,
                submittedAt: row.submittedAt || new Date().toISOString(),
                completed: row.completed !== 'false',
                responses: survey.questions.map((q) => ({
                  id: `${row.id}-${q.id}`,
                  surveyId: row.surveyId,
                  questionId: q.id,
                  value: row[q.id] ?? null,
                  timestamp: new Date().toISOString(),
                })),
              }

              const validation = validateSurveyResponse(response)
              if (validation.success) {
                responses.push(response)
              } else {
                errors.push({ row: index + 1, message: validation.errorMessage || 'Validation failed' })
              }
            } catch (error) {
              errors.push({ row: index + 1, message: error instanceof Error ? error.message : 'Unknown error' })
            }
          })

          resolve({
            success: errors.length === 0,
            responses,
            errors,
            warnings,
          })
        },
        error: (error) => {
          resolve({
            success: false,
            responses: [],
            errors: [{ row: 0, message: error.message }],
            warnings: [],
          })
        },
      })
    })
  })
}

export async function importJSON(file: File, survey: Survey): Promise<ImportResult> {
  const content = await file.text()
  const data = JSON.parse(content)
  const responses: SurveyResponse[] = []
  const errors: Array<{ row: number; message: string }> = []
  const warnings: Array<{ row: number; message: string }> = []
  const seenIds = new Set<string>()

  if (!Array.isArray(data)) {
    return {
      success: false,
      responses: [],
      errors: [{ row: 0, message: 'JSON must be an array' }],
      warnings: [],
    }
  }

  data.forEach((row: any, index: number) => {
    try {
      if (!row.id || !row.surveyId) {
        errors.push({ row: index + 1, message: 'Missing required fields' })
        return
      }

      if (seenIds.has(row.id)) {
        errors.push({ row: index + 1, message: 'Duplicate submission ID' })
        return
      }
      seenIds.add(row.id)

      const response: SurveyResponse = {
        id: row.id,
        surveyId: row.surveyId,
        submittedAt: row.submittedAt || new Date().toISOString(),
        completed: row.completed !== false,
        responses: survey.questions.map((q) => ({
          id: `${row.id}-${q.id}`,
          surveyId: row.surveyId,
          questionId: q.id,
          value: row[q.id] ?? null,
          timestamp: new Date().toISOString(),
        })),
      }

      const validation = validateSurveyResponse(response)
      if (validation.success) {
        responses.push(response)
      } else {
        errors.push({ row: index + 1, message: validation.errorMessage || 'Validation failed' })
      }
    } catch (error) {
      errors.push({ row: index + 1, message: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  return {
    success: errors.length === 0,
    responses,
    errors,
    warnings,
  }
}
