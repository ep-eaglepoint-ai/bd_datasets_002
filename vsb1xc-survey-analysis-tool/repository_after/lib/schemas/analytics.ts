import { z } from 'zod';

// Statistical Summary Schema
export const StatisticalSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
  mode: z.union([z.string(), z.number()]).nullable(),
  stdDev: z.number().nullable(),
  variance: z.number().nullable(),
  min: z.union([z.string(), z.number()]).nullable(),
  max: z.union([z.string(), z.number()]).nullable(),
  quartiles: z.object({
    q1: z.number().nullable(),
    q2: z.number().nullable(),
    q3: z.number().nullable(),
  }).optional(),
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
    level: z.number().min(0).max(1),
  }).optional(),
  frequencyDistribution: z.array(z.object({
    value: z.union([z.string(), z.number()]),
    count: z.number().int().nonnegative(),
    proportion: z.number().min(0).max(1),
  })).optional(),
});

export type StatisticalSummary = z.infer<typeof StatisticalSummarySchema>;

// Cross-Tabulation Schema
export const CrossTabulationSchema = z.object({
  questionId1: z.string(),
  questionId2: z.string(),
  table: z.array(z.array(z.number().int().nonnegative())),
  rowLabels: z.array(z.string()),
  columnLabels: z.array(z.string()),
  rowTotals: z.array(z.number().int().nonnegative()),
  columnTotals: z.array(z.number().int().nonnegative()),
  grandTotal: z.number().int().nonnegative(),
  chiSquare: z.number().nullable().optional(),
  pValue: z.number().nullable().optional(),
});

export type CrossTabulation = z.infer<typeof CrossTabulationSchema>;

// Sentiment Analysis Result
export const SentimentResultSchema = z.object({
  score: z.number().min(-1).max(1),
  magnitude: z.number().min(0).max(1),
  label: z.enum(['positive', 'negative', 'neutral']),
  keywords: z.array(z.object({
    word: z.string(),
    frequency: z.number().int().nonnegative(),
    sentiment: z.number().min(-1).max(1).optional(),
  })).default([]),
});

export type SentimentResult = z.infer<typeof SentimentResultSchema>;

// Thematic Analysis Result
export const ThematicAnalysisSchema = z.object({
  themes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    frequency: z.number().int().nonnegative(),
    responses: z.array(z.string()), // Response IDs
    keywords: z.array(z.string()),
  })),
  clusters: z.array(z.object({
    id: z.string(),
    responses: z.array(z.string()),
    centroid: z.array(z.number()).optional(),
  })).optional(),
});

export type ThematicAnalysis = z.infer<typeof ThematicAnalysisSchema>;

// Bias Detection Flags
export const BiasFlagsSchema = z.object({
  straightLining: z.boolean().default(false),
  randomAnswering: z.boolean().default(false),
  duplicateSubmission: z.boolean().default(false),
  extremeResponseBias: z.boolean().default(false),
  inconsistentAnswers: z.boolean().default(false),
  unusuallyFast: z.boolean().default(false),
  flags: z.array(z.string()).default([]),
  score: z.number().min(0).max(1), // Overall quality score
});

export type BiasFlags = z.infer<typeof BiasFlagsSchema>;

// Response Quality Metrics
export const ResponseQualityMetricsSchema = z.object({
  completionRate: z.number().min(0).max(1),
  dropoutPoint: z.string().nullable(), // Question ID where user dropped off
  averageResponseTime: z.number().nonnegative(), // milliseconds per question
  itemNonResponseRate: z.number().min(0).max(1),
  engagementCurve: z.array(z.object({
    questionId: z.string(),
    responseTime: z.number().nonnegative(),
    timestamp: z.string().datetime(),
  })).optional(),
});

export type ResponseQualityMetrics = z.infer<typeof ResponseQualityMetricsSchema>;

// Annotation Schema
export const AnnotationSchema = z.object({
  id: z.string(),
  responseId: z.string(),
  questionId: z.string(),
  codes: z.array(z.string()),
  themes: z.array(z.string()),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().optional(),
});

export type Annotation = z.infer<typeof AnnotationSchema>;

// Research Insight Schema
export const ResearchInsightSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  questionId: z.string().optional(),
  segmentId: z.string().optional(),
  title: z.string().min(1),
  content: z.string(),
  type: z.enum(['hypothesis', 'interpretation', 'caveat', 'finding', 'note']),
  linkedFindings: z.array(z.string()).default([]), // IDs of related insights
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ResearchInsight = z.infer<typeof ResearchInsightSchema>;

// Segment Schema
export const SegmentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  filter: z.object({
    questionId: z.string(),
    operator: z.enum(['equals', 'not-equals', 'contains', 'greater-than', 'less-than', 'in', 'not-in']),
    value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
  }),
  responseIds: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
});

export type Segment = z.infer<typeof SegmentSchema>;

// Visualization Configuration
export const VisualizationConfigSchema = z.object({
  type: z.enum(['bar', 'line', 'pie', 'scatter', 'heatmap', 'histogram', 'box-plot', 'correlation-matrix']),
  questionIds: z.array(z.string()),
  segmentIds: z.array(z.string()).optional(),
  options: z.record(z.unknown()).optional(),
});

export type VisualizationConfig = z.infer<typeof VisualizationConfigSchema>;
