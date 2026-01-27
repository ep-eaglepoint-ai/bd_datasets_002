/**
 * Requirement 8: Open-ended Response Analysis
 */
import { computeEnhancedSentiment, extractEnhancedThemes, clusterEnhancedResponses } from '@/lib/utils/enhancedTextAnalysis'
import { SurveyResponse } from '@/lib/schemas/survey'

describe('Requirement 8: Text Analysis', () => {
  const createResponse = (id: string, text: string): SurveyResponse => ({
    id,
    surveyId: 'survey-1',
    submittedAt: new Date().toISOString(),
    completed: true,
    responses: [
      {
        id: `${id}-q1`,
        surveyId: 'survey-1',
        questionId: 'q1',
        value: text,
        timestamp: new Date().toISOString(),
      },
    ],
  })

  test('should extract sentiment signals', () => {
    const result = computeEnhancedSentiment('I love this product! It is amazing and wonderful.')
    expect(result.score).toBeGreaterThan(0)
    expect(result.label).toBe('positive')
    expect(result.magnitude).toBeGreaterThan(0)
  })

  test('should extract keyword frequencies', () => {
    const result = computeEnhancedSentiment('The product is good and very good quality')
    expect(result.keywords.length).toBeGreaterThan(0)
    expect(result.keywords.some(k => k.word === 'good')).toBe(true)
  })

  test('should extract topic clusters', () => {
    const responses = [
      createResponse('resp1', 'I love the design and quality'),
      createResponse('resp2', 'The design is excellent and quality is great'),
      createResponse('resp3', 'Design quality is outstanding'),
    ]
    const clusters = clusterEnhancedResponses(responses, 'q1', 0.3)
    expect(clusters.clusters).toBeDefined()
  })

  test('should extract thematic patterns', () => {
    const responses = [
      createResponse('resp1', 'The product is good quality'),
      createResponse('resp2', 'Quality is excellent'),
      createResponse('resp3', 'Good quality product'),
    ]
    const themes = extractEnhancedThemes(responses, 'q1', 2)
    expect(themes.themes.length).toBeGreaterThan(0)
    expect(themes.themes.some(t => t.label.includes('quality'))).toBe(true)
  })

  test('should tolerate misspellings', () => {
    const result = computeEnhancedSentiment('This is exellent and terible')
    // Should still process despite misspellings
    expect(result.score).toBeDefined()
    expect(result.keywords.length).toBeGreaterThan(0)
  })

  test('should tolerate slang', () => {
    const result = computeEnhancedSentiment('This is gr8! I luv it! Thx!')
    expect(result.score).toBeDefined()
    // Should normalize slang
    expect(result.keywords.some(k => k.word === 'great' || k.word === 'love' || k.word === 'thanks')).toBe(true)
  })

  test('should handle multilingual text', () => {
    const result = computeEnhancedSentiment('This is good. Это хорошо.')
    expect(result.language).toBe('mixed')
    expect(result.score).toBeDefined()
  })

  test('should detect sarcasm', () => {
    const result = computeEnhancedSentiment('Yeah right, this is totally amazing. Obviously.')
    expect(result.isSarcastic).toBe(true)
    expect(result.sarcasmConfidence).toBeGreaterThan(0.5)
  })

  test('should handle noisy responses', () => {
    const result = computeEnhancedSentiment('This!!! Is!!! So!!! Good!!!')
    expect(result.score).toBeDefined()
    // Should normalize excessive punctuation
  })

  test('should not produce misleading conclusions', () => {
    // Sarcastic positive should be detected
    const sarcastic = computeEnhancedSentiment('Oh yeah, this is just wonderful. Not.')
    expect(sarcastic.isSarcastic).toBe(true)
    // Sentiment should be adjusted
    expect(sarcastic.score).toBeLessThan(0.5)
  })

  test('should handle negation', () => {
    const result = computeEnhancedSentiment('This is not good at all')
    // Negation should affect sentiment - either negative score or negative label
    expect(result.score < 0 || result.label === 'negative').toBe(true)
  })
})
