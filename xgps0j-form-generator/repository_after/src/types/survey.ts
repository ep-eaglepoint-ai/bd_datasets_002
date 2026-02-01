import { z } from 'zod';

// Question Types
export const QuestionType = z.enum([
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'rating_scale',
  'numeric_input',
  'boolean'
]);

export type QuestionType = z.infer<typeof QuestionType>;

// Base Question Schema
export const BaseQuestionSchema = z.object({
  id: z.string(),
  type: QuestionType,
  title: z.string().min(1, 'Question title is required'),
  description: z.string().optional(),
  required: z.boolean().default(false),
  order: z.number(),
  sectionId: z.string().optional(),
});

// Specific Question Schemas
export const ShortTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('short_text'),
  maxLength: z.number().min(1).max(1000).optional(),
  placeholder: z.string().optional(),
});

export const LongTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('long_text'),
  maxLength: z.number().min(1).max(10000).optional(),
  placeholder: z.string().optional(),
});

export const SingleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('single_choice'),
  options: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
    value: z.string(),
  })).min(2, 'At least 2 options required'),
});

export const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('multiple_choice'),
  options: z.array(z.object({
    id: z.string(),
    label: z.string().min(1),
    value: z.string(),
  })).min(2, 'At least 2 options required'),
  minSelections: z.number().min(0).optional(),
  maxSelections: z.number().min(1).optional(),
});

export const RatingScaleQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('rating_scale'),
  minValue: z.number().min(1).default(1),
  maxValue: z.number().max(10).default(5),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});

export const NumericInputQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('numeric_input'),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  allowDecimals: z.boolean().default(false),
  placeholder: z.string().optional(),
});

export const BooleanQuestionSchema = BaseQuestionSchema.extend({
  type: z.literal('boolean'),
  trueLabel: z.string().default('Yes'),
  falseLabel: z.string().default('No'),
});

// Union of all question types
export const QuestionSchema = z.discriminatedUnion('type', [
  ShortTextQuestionSchema,
  LongTextQuestionSchema,
  SingleChoiceQuestionSchema,
  MultipleChoiceQuestionSchema,
  RatingScaleQuestionSchema,
  NumericInputQuestionSchema,
  BooleanQuestionSchema,
]);

export type Question = z.infer<typeof QuestionSchema>;

// Section Schema
export const SectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Section title is required'),
  description: z.string().optional(),
  order: z.number(),
});

export type Section = z.infer<typeof SectionSchema>;

// Survey Schema
export const SurveySchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Survey title is required'),
  description: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().default(1),
  published: z.boolean().default(false),
  publishedAt: z.date().optional(),
  sections: z.array(SectionSchema).default([]),
  questions: z.array(QuestionSchema).default([]),
  settings: z.object({
    allowAnonymous: z.boolean().default(true),
    requireCompletion: z.boolean().default(false),
    showProgressBar: z.boolean().default(true),
    randomizeQuestions: z.boolean().default(false),
    collectTimestamps: z.boolean().default(true),
  }).default({}),
});

export type Survey = z.infer<typeof SurveySchema>;

// Response Schemas
export const ResponseValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

export type ResponseValue = z.infer<typeof ResponseValueSchema>;

export const ResponseAnswerSchema = z.object({
  questionId: z.string(),
  value: ResponseValueSchema,
  timestamp: z.date().optional(),
});

export type ResponseAnswer = z.infer<typeof ResponseAnswerSchema>;

export const ResponseSchema = z.object({
  id: z.string(),
  surveyId: z.string(),
  surveyVersion: z.number(),
  answers: z.array(ResponseAnswerSchema),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  isComplete: z.boolean().default(false),
  completionRate: z.number().min(0).max(1),
  timeToComplete: z.number().optional(), // in seconds
  metadata: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    sessionId: z.string().optional(),
  }).optional(),
});

export type Response = z.infer<typeof ResponseSchema>;

// Analytics Schemas
export const QuestionAnalyticsSchema = z.object({
  questionId: z.string(),
  questionType: QuestionType,
  totalResponses: z.number(),
  validResponses: z.number(),
  responseRate: z.number(),
  distribution: z.record(z.number()),
  statistics: z.object({
    mean: z.number().optional(),
    median: z.number().optional(),
    mode: z.union([z.string(), z.number()]).optional(),
    standardDeviation: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }).optional(),
});

export type QuestionAnalytics = z.infer<typeof QuestionAnalyticsSchema>;

export const SurveyAnalyticsSchema = z.object({
  surveyId: z.string(),
  totalResponses: z.number(),
  completedResponses: z.number(),
  completionRate: z.number(),
  averageTimeToComplete: z.number().optional(),
  responsesByDay: z.record(z.number()),
  questionAnalytics: z.array(QuestionAnalyticsSchema),
  lastUpdated: z.date(),
});

export type SurveyAnalytics = z.infer<typeof SurveyAnalyticsSchema>;