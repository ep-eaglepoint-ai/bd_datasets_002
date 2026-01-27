import { z } from 'zod';

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  project: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const AnalyticsResultSchema = z.object({
  documentId: z.string(),
  timestamp: z.number(),
  wordCount: z.number(),
  characterCount: z.number(),
  sentenceCount: z.number(),
  paragraphCount: z.number(),
  sentiment: z.object({
    score: z.number(),
    polarity: z.enum(['positive', 'negative', 'neutral']),
    intensity: z.number(),
    sentenceLevel: z.array(z.object({
      sentence: z.string(),
      score: z.number(),
      polarity: z.enum(['positive', 'negative', 'neutral']),
    })).optional(),
    volatility: z.number().optional(),
    moodPatterns: z.array(z.string()).optional(),
  }),
  readability: z.object({
    fleschReadingEase: z.number(),
    fleschKincaidGrade: z.number(),
    gunningFog: z.number(),
    smogIndex: z.number(),
    sentenceComplexity: z.number().optional(),
  }),
  lexicalRichness: z.object({
    typeTokenRatio: z.number(),
    movingAverageTTR: z.number().optional(),
    hapaxLegomena: z.number(),
    repetitionRate: z.number().optional(),
    rareWordUsage: z.number().optional(),
    vocabularyDiversity: z.number(),
  }),
  styleMetrics: z.object({
    avgSentenceLength: z.number(),
    avgWordLength: z.number(),
    passiveVoiceCount: z.number(),
    punctuationDensity: z.number(),
    clauseDepth: z.number().optional(),
    coordinationFrequency: z.number().optional(),
    syntacticVariation: z.number().optional(),
    rhythmPatterns: z.array(z.number()).optional(),
    functionWordRatio: z.number().optional(),
  }),
  grammarMetrics: z.object({
    tenseConsistency: z.number().optional(),
    pronounUsage: z.record(z.number()).optional(),
    verbFormDistribution: z.record(z.number()).optional(),
    modifierDensity: z.number().optional(),
  }).optional(),
  keywords: z.array(z.string()).optional(),
  nGrams: z.array(z.object({
    phrase: z.string(),
    count: z.number(),
  })).optional(),
  repeatedPhrases: z.array(z.object({
    phrase: z.string(),
    count: z.number(),
    isDeliberate: z.boolean().optional(),
  })).optional(),
});

export const AnnotationSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  content: z.string(),
  timestamp: z.number(),
});

export const SnapshotSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  content: z.string(),
  analytics: AnalyticsResultSchema,
  timestamp: z.number(),
});

export const WritingGoalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetMetric: z.enum(['wordCount', 'consistency', 'readability', 'sentiment']),
  targetValue: z.number(),
  currentValue: z.number(),
  deadline: z.number().optional(),
  createdAt: z.number(),
  completed: z.boolean(),
});

export const DailyTrendSchema = z.object({
  date: z.string(),
  wordCount: z.number(),
  documentCount: z.number(),
  avgSentiment: z.number(),
  avgReadability: z.number(),
});

export const ComparisonResultSchema = z.object({
  doc1Id: z.string(),
  doc2Id: z.string(),
  toneDifference: z.number(),
  vocabularyDifference: z.number(),
  readabilityDifference: z.number(),
  complexityDifference: z.number(),
  sentimentDifference: z.number(),
  timestamp: z.number(),
});

export type Document = z.infer<typeof DocumentSchema>;
export type AnalyticsResult = z.infer<typeof AnalyticsResultSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
export type WritingGoal = z.infer<typeof WritingGoalSchema>;
export type DailyTrend = z.infer<typeof DailyTrendSchema>;
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;
