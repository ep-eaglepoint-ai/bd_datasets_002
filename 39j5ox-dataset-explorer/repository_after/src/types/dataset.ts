import { z } from 'zod';

export const DataTypeSchema = z.enum(['string', 'number', 'boolean', 'date', 'categorical']);
export type DataType = z.infer<typeof DataTypeSchema>;

export const ColumnSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: DataTypeSchema,
  originalType: DataTypeSchema.optional(),
  nullable: z.boolean().default(false),
  unique: z.boolean().default(false),
  stats: z.object({
    count: z.number(),
    nullCount: z.number(),
    uniqueCount: z.number(),
    min: z.union([z.string(), z.number(), z.date()]).optional(),
    max: z.union([z.string(), z.number(), z.date()]).optional(),
    mean: z.number().optional(),
    median: z.number().optional(),
    mode: z.union([z.string(), z.number()]).optional(),
    stdDev: z.number().optional(),
    distribution: z.record(z.string(), z.number()).optional(),
  }).optional(),
});

export type Column = z.infer<typeof ColumnSchema>;

export const FilterOperatorSchema = z.enum([
  'equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with',
  'greater_than', 'less_than', 'greater_equal', 'less_equal', 'between',
  'in', 'not_in', 'is_null', 'is_not_null', 'regex'
]);

export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  operator: FilterOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).optional(),
  enabled: z.boolean().default(true),
});

export type Filter = z.infer<typeof FilterSchema>;

export const TransformationTypeSchema = z.enum([
  'rename_column', 'cast_type', 'trim_whitespace', 'replace_text', 'split_column',
  'merge_columns', 'derive_column', 'normalize_text', 'extract_regex'
]);

export type TransformationType = z.infer<typeof TransformationTypeSchema>;

export const TransformationSchema = z.object({
  id: z.string(),
  type: TransformationTypeSchema,
  columnId: z.string(),
  targetColumnId: z.string().optional(),
  parameters: z.record(z.string(), z.any()),
  enabled: z.boolean().default(true),
});

export type Transformation = z.infer<typeof TransformationSchema>;

export const DatasetVersionSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  name: z.string(),
  description: z.string().optional(),
  columns: z.array(ColumnSchema),
  rowCount: z.number(),
  filters: z.array(FilterSchema),
  transformations: z.array(TransformationSchema),
  checksum: z.string(),
});

export type DatasetVersion = z.infer<typeof DatasetVersionSchema>;

export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalFileName: z.string(),
  uploadedAt: z.date(),
  size: z.number(),
  encoding: z.string().default('utf-8'),
  delimiter: z.string().default(','),
  hasHeader: z.boolean().default(true),
  currentVersion: z.string(),
  versions: z.array(DatasetVersionSchema),
  rawData: z.array(z.record(z.string(), z.any())),
  processedData: z.array(z.record(z.string(), z.any())),
});

export type Dataset = z.infer<typeof DatasetSchema>;

export const ParseConfigSchema = z.object({
  delimiter: z.string().default(','),
  quoteChar: z.string().default('"'),
  escapeChar: z.string().default('"'),
  encoding: z.string().default('utf-8'),
  hasHeader: z.boolean().default(true),
  skipEmptyLines: z.boolean().default(true),
  trimWhitespace: z.boolean().default(true),
});

export type ParseConfig = z.infer<typeof ParseConfigSchema>;

export const ExportConfigSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']),
  includeHeaders: z.boolean().default(true),
  delimiter: z.string().default(','),
  encoding: z.string().default('utf-8'),
  compression: z.boolean().default(false),
});

export type ExportConfig = z.infer<typeof ExportConfigSchema>;