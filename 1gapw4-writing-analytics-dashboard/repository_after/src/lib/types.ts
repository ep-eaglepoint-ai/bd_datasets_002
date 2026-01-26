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
  }),
  readability: z.object({
    fleschReadingEase: z.number(),
    fleschKincaidGrade: z.number(),
    gunningFog: z.number(),
    smogIndex: z.number(),
  }),
  lexicalRichness: z.object({
    typeTokenRatio: z.number(),
    hapaxLegomena: z.number(),
    vocabularyDiversity: z.number(),
  }),
  styleMetrics: z.object({
    avgSentenceLength: z.number(),
    avgWordLength: z.number(),
    passiveVoiceCount: z.number(),
    punctuationDensity: z.number(),
  }),
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

export type Document = z.infer<typeof DocumentSchema>;
export type AnalyticsResult = z.infer<typeof AnalyticsResultSchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type Snapshot = z.infer<typeof SnapshotSchema>;
