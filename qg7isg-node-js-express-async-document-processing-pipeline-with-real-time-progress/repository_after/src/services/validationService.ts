import { z, ZodSchema, ZodTypeAny } from 'zod';
import { ValidationRule, SchemaField } from '../types';

export class ValidationService {
  private schema: ZodSchema;

  constructor(fields: SchemaField[]) {
    this.schema = this.buildSchema(fields);
  }

  private buildSchema(fields: SchemaField[]): ZodSchema {
    const shape: Record<string, ZodTypeAny> = {};

    for (const field of fields) {
      let fieldSchema: ZodTypeAny;
      const validation = field.validation;

      if (!validation) {
        fieldSchema = z.any();
      } else {
        switch (validation.type) {
          case 'string':
            fieldSchema = z.string();
            if (validation.min !== undefined) {
              fieldSchema = (fieldSchema as z.ZodString).min(validation.min);
            }
            if (validation.max !== undefined) {
              fieldSchema = (fieldSchema as z.ZodString).max(validation.max);
            }
            if (validation.pattern) {
              fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(validation.pattern));
            }
            if (validation.enum) {
              fieldSchema = z.enum(validation.enum as [string, ...string[]]);
            }
            break;

          case 'number':
            fieldSchema = z.number();
            if (validation.min !== undefined) {
              fieldSchema = (fieldSchema as z.ZodNumber).min(validation.min);
            }
            if (validation.max !== undefined) {
              fieldSchema = (fieldSchema as z.ZodNumber).max(validation.max);
            }
            break;

          case 'boolean':
            fieldSchema = z.boolean();
            break;

          case 'date':
            fieldSchema = z.string().datetime().or(z.date());
            break;

          case 'email':
            fieldSchema = z.string().email();
            break;

          case 'url':
            fieldSchema = z.string().url();
            break;

          default:
            fieldSchema = z.any();
        }

        if (!validation.required) {
          fieldSchema = fieldSchema.optional();
        }
      }

      shape[field.name] = fieldSchema;
    }

    return z.object(shape);
  }

  validate(record: Record<string, any>): { success: boolean; data?: any; errors?: any[] } {
    try {
      const result = this.schema.safeParse(record);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        const errors = result.error.issues.map((err) => ({
          field: err.path.join('.'),
          code: err.code,
          message: err.message,
          value: err.path[0] !== undefined ? record[String(err.path[0])] : undefined,
        }));
        return { success: false, errors };
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'unknown',
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          value: null,
        }],
      };
    }
  }
}

export function transformRecord(record: Record<string, any>, fields: SchemaField[]): Record<string, any> {
  const transformed: Record<string, any> = {};

  for (const field of fields) {
    const sourceField = field.transform?.mapping || field.name;
    let value = record[sourceField];

    // Apply default if value is undefined
    if (value === undefined && field.transform?.default !== undefined) {
      value = field.transform.default;
    }

    // Type conversion
    if (value !== undefined && field.validation) {
      switch (field.validation.type) {
        case 'number':
          value = typeof value === 'string' ? parseFloat(value) : value;
          break;
        case 'boolean':
          if (typeof value === 'string') {
            value = value.toLowerCase() === 'true' || value === '1';
          }
          break;
        case 'date':
          if (typeof value === 'string') {
            value = new Date(value);
          }
          break;
      }
    }

    transformed[field.name] = value;
  }

  return transformed;
}
