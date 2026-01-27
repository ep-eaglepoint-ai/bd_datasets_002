import { z } from 'zod';

// Question Type Enums
export const QuestionTypeSchema = z.enum([
  'multiple-choice',
  'rating-scale',
  'numeric',
  'text',
  'ranking',
  'matrix',
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;

// Rating Scale Configuration
export const RatingScaleConfigSchema = z.object({
  min: z.number().int().min(1).max(100),
  max: z.number().int().min(1).max(100),
  step: z.number().int().min(1).default(1),
  labels: z.object({
    min: z.string().optional(),
    max: z.string().optional(),
  }).optional(),
}).refine((data) => data.min < data.max, {
  message: 'Minimum must be less than maximum',
  path: ['min'],
});

// Multiple Choice Option
export const ChoiceOptionSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
});

// Matrix Question Configuration
export const MatrixConfigSchema = z.object({
  rows: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
  })).min(1),
  columns: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
  })).min(1),
  type: z.enum(['single', 'multiple']).default('single'),
});

// Ranking Configuration
export const RankingConfigSchema = z.object({
  options: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
  })).min(2),
  allowTies: z.boolean().default(false),
});

// Base Question Schema
export const BaseQuestionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Question title is required'),
  description: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
});

// Question Type-Specific Schemas
export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('multiple-choice'),
  options: z.array(ChoiceOptionSchema).min(2, 'At least 2 options required'),
  allowMultiple: z.boolean().default(false),
  allowOther: z.boolean().default(false),
});

export const RatingScaleQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('rating-scale'),
  scale: RatingScaleConfigSchema,
});

export const NumericQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('numeric'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  unit: z.string().optional(),
});

export const TextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('text'),
  maxLength: z.number().int().positive().optional(),
  multiline: z.boolean().default(false),
});

export const RankingQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('ranking'),
  ranking: RankingConfigSchema,
});

export const MatrixQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('matrix'),
  matrix: MatrixConfigSchema,
});

// Union of all question types
export const QuestionSchema = z.discriminatedUnion('type', [
  MultipleChoiceQuestionSchema,
  RatingScaleQuestionSchema,
  NumericQuestionSchema,
  TextQuestionSchema,
  RankingQuestionSchema,
  MatrixQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;

// Survey Schema with comprehensive validation
export const SurveySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Survey title is required'),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  questions: z.array(QuestionSchema), // Allow empty surveys for initial state, but validation can enforce min
  metadata: z.object({
    version: z.string().default('1.0.0'),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }).optional(),
})
  .refine((survey) => {
    // Require at least one question for valid surveys
    if (survey.questions.length === 0) return false;
    return true;
  }, {
    message: 'Survey must have at least one question',
    path: ['questions'],
  })
  .refine((survey) => {
    // Ensure question orders are unique and sequential
    if (survey.questions.length === 0) return true;
    const orders = survey.questions.map(q => q.order).sort((a, b) => a - b);
    // Check that orders are sequential (can start from any number)
    const firstOrder = orders[0];
    return orders.every((order, index) => order === firstOrder + index);
  }, {
    message: 'Question orders must be unique and sequential',
    path: ['questions'],
  })
  .refine((survey) => {
    // Validate that all required questions have constraints
    return survey.questions.every(q => {
      if (!q.required) return true;
      
      // Check question-specific constraints
      if (q.type === 'multiple-choice' && (!q.options || q.options.length < 2)) {
        return false;
      }
      if (q.type === 'rating-scale') {
        return q.scale.min < q.scale.max;
      }
      if (q.type === 'numeric') {
        if (q.min !== undefined && q.max !== undefined) {
          return q.min < q.max;
        }
      }
      if (q.type === 'ranking' && (!q.ranking.options || q.ranking.options.length < 2)) {
        return false;
      }
      if (q.type === 'matrix') {
        return q.matrix.rows.length > 0 && q.matrix.columns.length > 0;
      }
      return true;
    });
  }, {
    message: 'Required questions must have valid constraints',
    path: ['questions'],
  })
  .refine((survey) => {
    // Check for inconsistent scoring scales across rating questions
    const ratingQuestions = survey.questions.filter(q => q.type === 'rating-scale');
    if (ratingQuestions.length === 0) return true;
    
    // Check if scales are consistent (same min/max) or warn if different
    const scales = ratingQuestions.map(q => ({
      min: q.scale.min,
      max: q.scale.max,
    }));
    
    // All scales should have the same range for consistency
    const firstScale = scales[0];
    return scales.every(s => s.min === firstScale.min && s.max === firstScale.max);
  }, {
    message: 'Rating scale questions should use consistent scoring scales',
    path: ['questions'],
  });

export type Survey = z.infer<typeof SurveySchema>;

// Response Value Schemas
export const ResponseValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
  z.record(z.union([z.string(), z.number()])), // For matrix responses
]);

// Individual Response Schema
export const ResponseSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  questionId: z.string(),
  value: ResponseValueSchema.nullable(),
  timestamp: z.string().datetime(),
  metadata: z.object({
    responseTime: z.number().optional(), // milliseconds
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    sessionId: z.string().optional(),
  }).optional(),
});

export type Response = z.infer<typeof ResponseSchema>;

// Complete Survey Response (all questions answered)
export const SurveyResponseSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  responses: z.array(ResponseSchema),
  submittedAt: z.string().datetime(),
  completed: z.boolean().default(false),
  metadata: z.object({
    totalTime: z.number().optional(),
    startTime: z.string().datetime().optional(),
    completionRate: z.number().min(0).max(1).optional(),
    qualityFlags: z.array(z.string()).default([]),
  }).optional(),
});

export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;

// Data Type Inference
export const DataTypeSchema = z.enum([
  'numeric',
  'categorical',
  'ordinal',
  'boolean',
  'text',
  'date',
  'mixed',
]);

export type DataType = z.infer<typeof DataTypeSchema>;

// Dataset Snapshot Schema (for reproducibility)
export const DatasetSnapshotSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  responses: z.array(SurveyResponseSchema),
  cleaningRules: z.array(z.object({
    id: z.string(),
    type: z.enum(['remove-duplicates', 'trim-whitespace', 'normalize-text', 'standardize-labels', 'handle-missing', 'flag-outliers', 'transform']),
    config: z.record(z.unknown()),
    appliedAt: z.string().datetime(),
  })).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type DatasetSnapshot = z.infer<typeof DatasetSnapshotSchema>;
